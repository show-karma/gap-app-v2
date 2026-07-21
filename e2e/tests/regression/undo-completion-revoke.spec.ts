import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, Route } from "@playwright/test";
import { expect, test } from "../../fixtures";

/**
 * Browser-automation coverage for PR #1622 — "fail fast on revoke errors
 * instead of polling for 5 minutes".
 *
 * Flow under test: a COMPLETED project milestone shows a red trash "Revoke
 * Completion" button -> DeleteDialog -> "Continue" runs
 * useMilestone.multiGrantUndoCompletion -> useOffChainRevoke.performOffChainRevoke
 * (POST /attestations/revoke/...), then a bounded interactive indexing poll.
 *
 * What this validates beyond the unit suites:
 *  - the real attestation toast renders with the scenario-specific copy,
 *  - the DeleteDialog STAYS OPEN on failure (it only closes on success),
 *  - exactly ONE toast (no generic "Operation failed" stacked on the specific one),
 *  - failure surfaces FAST (seconds for a rejected revoke) instead of the old
 *    multi-minute hang.
 *
 * Rendering strategy: real staging payloads (captured under e2e/data/fixtures)
 * give a crash-free project shell + an SDK-deserialisable project; the Updates
 * feed is overridden with one synthetic COMPLETED project-milestone we fully
 * control. Authorization is forced through the E2EStoreExposer bridge. All
 * other traffic is stubbed — including a generic JSON-RPC stub so the GAP SDK's
 * ethers provider initialises offline — so the scenario is deterministic.
 */

const fx = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../data/fixtures", name), "utf8"));
const realProject = fx("real-project.json"); // GET /v2/projects/{slug} (store hydration)
const sdkProject = fx("real-sdk-project.json"); // GET /projects/{uid} (SDK getProjectById)
const realUpdates = fx("real-updates.json"); // GET /v2/projects/{slug}/updates

const SLUG = realProject.details.slug as string;
const PROJECT_UID = realProject.uid as string;
const MILESTONE_UID = "0x2222222222222222222222222222222222222222222222222222222222222222";
const COMPLETED_UID = "0x3333333333333333333333333333333333333333333333333333333333333333";
const RECIPIENT = (realProject.recipient || realProject.owner) as string;

const json = (body: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const GUEST_PERMS = {
  roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
  permissions: [],
  resourceContext: {},
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
};

const completedMilestone = {
  uid: MILESTONE_UID,
  title: "E2E Completed Milestone",
  description: "A project milestone completed and revocable.",
  status: "completed",
  recipient: RECIPIENT,
  attester: RECIPIENT,
  createdAt: "2026-05-15T10:00:00Z",
  dueDate: "2026-12-31T00:00:00Z",
  completionDetails: {
    completedAt: "2026-06-10T14:32:00Z",
    completedBy: RECIPIENT,
    description: "Work completed and verified.",
    proofOfWork: "https://example.com/proof",
  },
};

// getProjectObjectives shape; `completed` present until `removed` flips.
const objectives = (removed: boolean) => ({
  milestones: [
    {
      uid: MILESTONE_UID,
      title: "E2E Completed Milestone",
      statusUpdatedAt: "2026-06-10T14:32:00Z",
      completed: removed
        ? null
        : {
            attestationUID: COMPLETED_UID,
            timestamp: "2026-06-10T14:32:00Z",
            attester: RECIPIENT,
            reason: "Work completed and verified.",
          },
    },
  ],
});

// Minimal JSON-RPC stub so the GAP SDK's ethers provider detects the network
// offline (the off-chain revoke path needs no real chain calls — only the
// provider init blocks). Detected by the JSON-RPC envelope, not by URL, so it
// is independent of whichever RPC endpoint the build resolves.
function rpcStub(route: Route, post: string) {
  let body: unknown;
  try {
    body = JSON.parse(post);
  } catch {
    body = [];
  }
  const reply = (req: { method?: string; id?: number }) => {
    let result: unknown = "0x";
    if (req?.method === "eth_chainId")
      result = "0xaa37dc"; // 11155420
    else if (req?.method === "net_version") result = "11155420";
    else if (req?.method === "eth_blockNumber") result = "0x1";
    return { jsonrpc: "2.0", id: req?.id ?? 1, result };
  };
  return route.fulfill(json(Array.isArray(body) ? body.map(reply) : reply(body as never)));
}

interface Scenario {
  revoke: (route: Route) => unknown;
  objectivesRemoved: () => boolean;
}

async function setupProjectPage(
  page: Page,
  loginAs: (role: "communityAdmin") => Promise<void>,
  scenario: Scenario
) {
  await loginAs("communityAdmin");

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const post = route.request().postData() || "";

    if (post.includes('"jsonrpc"') || post.includes('"eth_chainId"')) return rpcStub(route, post);
    if (
      url.includes("localhost") &&
      !path.startsWith("/v2/") &&
      !path.startsWith("/projects/") &&
      !path.startsWith("/api/")
    ) {
      return route.continue(); // Next.js assets / RSC
    }
    if (path.includes("/auth/permissions")) return route.fulfill(json(GUEST_PERMS));
    if (path.includes("/auth/staff/authorized")) return route.fulfill(json({ authorized: false }));
    if (path.startsWith("/attestations/revoke/")) return scenario.revoke(route);
    if (path === `/v2/projects/${SLUG}`) return route.fulfill(json(realProject));
    if (path.startsWith(`/v2/projects/${SLUG}/updates`)) {
      return route.fulfill(json({ ...realUpdates, projectMilestones: [completedMilestone] }));
    }
    if (path.match(/\/v2\/projects\/.+\/milestones/)) {
      return route.fulfill(json(objectives(scenario.objectivesRemoved())));
    }
    if (path === `/projects/${PROJECT_UID}`) return route.fulfill(json(sdkProject));
    if (
      path.match(/\/v2\/projects\/.+\/grants/) ||
      path.match(/\/projects\/.+\/(grants|impacts)/)
    ) {
      return route.fulfill(json([]));
    }
    return route.abort(); // everything else (privy, analytics, misc) — graceful failure
  });

  await page.goto(`/project/${SLUG}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByText("E2E Completed Milestone").first().waitFor({ timeout: 30000 });
  // On-chain permission checks abort in-sandbox; force ownership as the last
  // write so the revoke control renders.
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    (
      window as unknown as { __E2E_STORES__?: { setIsProjectOwner?: (v: boolean) => void } }
    ).__E2E_STORES__?.setIsProjectOwner?.(true);
  });
  await expect(page.locator("button.text-red-500").first()).toBeVisible({ timeout: 10000 });
}

async function confirmRevoke(page: Page) {
  await page.locator("button.text-red-500").first().click();
  await expect(page.getByText(/Are you sure you want to revoke the completion/i)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
}

const dialog = (page: Page) => page.getByText(/Are you sure you want to revoke the completion/i);

test.describe("Undo completion revoke — fail fast (PR #1622)", () => {
  test.slow();
  // Relies on the E2EStoreExposer bridge (window.__E2E_STORES__) to force
  // project ownership, which only mounts when the app is built with the E2E
  // auth-bypass flag. Skip cleanly under real-login CI runs.
  test.beforeEach(() => {
    test.skip(
      process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS !== "true",
      "Requires NEXT_PUBLIC_E2E_AUTH_BYPASS=true (E2EStoreExposer store bridge)"
    );
  });

  test("rejected revoke surfaces a fast, specific toast and keeps the dialog open", async ({
    page,
    loginAs,
  }) => {
    await setupProjectPage(page, loginAs, {
      objectivesRemoved: () => false,
      revoke: (route) => route.fulfill(json({ message: "Revoke rejected by server" }, 400)),
    });

    await confirmRevoke(page);

    const start = Date.now();
    await expect(page.getByText(/Revoke rejected by server/i).first()).toBeVisible({
      timeout: 20000,
    });
    expect(Date.now() - start).toBeLessThan(20000); // fast-fail, not a multi-minute hang
    await expect(dialog(page)).toBeVisible(); // dialog stays open on failure
    await expect(page.getByText(/Operation failed\. Please try again\./i)).toHaveCount(0); // single toast
  });

  test("happy path: revoke succeeds and the dialog closes", async ({ page, loginAs }) => {
    let revoked = false;
    await setupProjectPage(page, loginAs, {
      objectivesRemoved: () => revoked,
      revoke: (route) => {
        revoked = true;
        return route.fulfill(json({ success: true }));
      },
    });

    await confirmRevoke(page);
    await expect(dialog(page)).toBeHidden({ timeout: 25000 });
  });

  test("accepted-but-unindexed revoke times out bounded (well under the old ~5 min)", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(160000);
    await setupProjectPage(page, loginAs, {
      objectivesRemoved: () => false, // indexer never reflects the revoke
      revoke: (route) => route.fulfill(json({ success: true })),
    });

    await confirmRevoke(page);

    const start = Date.now();
    await expect(page.getByText(/still being indexed/i).first()).toBeVisible({ timeout: 120000 });
    expect(Date.now() - start).toBeLessThan(120000); // bounded by INTERACTIVE_INDEXING_POLL (~60s)
    await expect(dialog(page)).toBeVisible();
  });
});
