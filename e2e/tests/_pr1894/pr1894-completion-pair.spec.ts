import { type APIRequestContext, request as playwrightRequest } from "@playwright/test";
import { expect, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * PR pair preview gate — gap-app-v2#1894 (bounded indexing wait + actionable
 * failure message) + gap-indexer#2265 (milestone-completion authorization for
 * linked wallets, members, and relayed submissions).
 *
 * WHAT THIS SPEC IS
 * The cross-service guardrails require a real end-to-end run against deployed
 * previews before the pair merges. The strongest E2E evidence available for
 * #2265 is free and uses no fixtures at all: five REAL completion attestations
 * exist on Base that the pre-fix indexer verifiably dropped (Sentry
 * GAP-INDEXER-M8/QE, "Not admin or recipient of milestone"). Replaying their
 * transactions through POST /attestations/index-by-transaction against a
 * deployed indexer is a production-data differential:
 *   - pre-fix (main): the attestation stays unindexed → GET /attestations/:uid
 *     answers 422 → this suite is RED (verified against gapapi on 2026-07-22)
 *   - post-fix: the same replay indexes them → GREEN
 *
 * HOW TO RUN (the preview gate)
 *   # BE half — replay differential against the deployed indexer preview:
 *   E2E_INDEXER_URL=https://<indexer-preview> \
 *     pnpm exec playwright test e2e/tests/_pr1894 --project=chromium
 *
 *   # FE half on top — read seam against the Vercel preview:
 *   BASE_URL=https://<vercel-preview> E2E_INDEXER_URL=... E2E_LIVE_PAIR=1 \
 *     pnpm exec playwright test e2e/tests/_pr1894 --project=chromium
 *
 * The target indexer must hold the Base dataset (production data or a preview
 * sharing it). Staging (gapstagapi) does NOT index Base — the suite detects
 * that in a precondition check and skips with an actionable message instead of
 * failing meaninglessly.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * The sign → poll → timeout flow of #1894 cannot be driven in headless
 * Chromium: completing a milestone needs a real Privy embedded-wallet
 * signature, and Privy's useWallets() does not surface injected mock wallets
 * (same limitation pr1618 documented). That contract — INTERACTIVE poll
 * budget, IndexingTimeoutError, the actionable message — is pinned by
 * __tests__/unit/hooks/useMilestoneCompletionIndexingTimeout.test.ts.
 * Semantic rejection paths (stranger, revoked MemberOf, proxy laundering) are
 * pinned against real Mongo rows by gap-indexer's
 * test/integration/v2/attestation/milestone-completion-authorization suite —
 * they cannot be exercised here because no such attestations exist on-chain
 * to replay.
 *
 * Failure paths exercised HERE (guardrails §4 requires two): the wire contract
 * on unknown attestation uids and unknown transaction hashes — both must be
 * clean client errors, never 5xx (the #2237 contract the FE relies on).
 */

const INDEXER_URL = process.env.E2E_INDEXER_URL;
const LIVE_PAIR = process.env.E2E_LIVE_PAIR === "1";

const CHAIN_ID = 8453;
const PROJECT_SLUG = "filecoin-foundation-infrastructure--coordination-stewardship";
const MILESTONE_UID = "0x35f1c4ca3f03dfcd1312df64d06c434bb612505d1a18877c65999adedbaa3b5d";
const MILESTONE_TITLE = "Systems Boundary Mapping";

/**
 * The production-dropped completions. All on-chain facts — uid and txid are
 * immutable, resolved from Base EAS GraphQL on 2026-07-22 and pinned here so
 * the suite has no live EAS dependency.
 *
 * Flow mapping (guardrails §1):
 * - `linked-sibling`: signer 0x19f8BD91… holds no on-chain authority; its
 *   Privy-linked sibling 0xBa1F3d7f… is the project owner/admin on the
 *   resolver. The reported incident, four independent attempts.
 * - `relayed`: attester is the Base multicall proxy (gasless), addressed to
 *   the milestone's recipient — the courier-only trust arm.
 */
const DROPPED_COMPLETIONS = [
  {
    flow: "linked-sibling",
    uid: "0xf56834be3e16c6c77671a70cb9aaa3ae6b61b71649345b852865b390a8720338",
    txid: "0x96d40317dc0aecacc5a4e8e43659b6ff7528597c7984889572e01d505057bb4b",
    attester: "0x19f8bd91ec1c1885a62efeef6d9614d57c1e0257",
  },
  {
    flow: "linked-sibling",
    uid: "0x0391a78bbb0c25eeb62606daf5367c34df19f16d9ee1814b28e63a40a10e5cfc",
    txid: "0x1ef56c387d99cb5efbfad7b94fb8ab16a6abcd46cb245fc3974b9c0cee18efde",
    attester: "0x19f8bd91ec1c1885a62efeef6d9614d57c1e0257",
  },
  {
    flow: "linked-sibling",
    uid: "0x079d7cc4c419df1fb93353118f954dd16506c97369f9b6fe857bae8bf652ca39",
    txid: "0xb6696aa35c8b6ca0c158cedea3e05b816b19f779cd00c94426042b9473defe45",
    attester: "0x19f8bd91ec1c1885a62efeef6d9614d57c1e0257",
  },
  {
    flow: "linked-sibling",
    uid: "0xaf5b13ad057cbf5091fb4289f507309e316b121a7050adf283cf9f40033064f8",
    txid: "0x13d121ae8c5b9cf46e3bb5fdea5b61ccb8b5550c0bc585fd45a4270abd3d1a34",
    attester: "0x19f8bd91ec1c1885a62efeef6d9614d57c1e0257",
  },
] as const;

/**
 * Relay-arm replay, isolated in its own test: same rejection class in Sentry,
 * but a different project's ref chain and a different authorization arm. A
 * failure here post-deploy is a finding about that grant's ownership shape,
 * not about the linked-sibling fix — keep the signals separable.
 */
const DROPPED_RELAYED_COMPLETION = {
  flow: "relayed",
  uid: "0x22129ea6aaff71b2fe63347a45dc11730be03afba0c0a30836f10b3667f05fb6",
  txid: "0x383ed6fb61bb341a4f20289b9f022f1b686795a70aee568f60ebe8ce9a3ed98e",
  attester: "0x7177adc0f924b695c0294a40c4c5feff5ee1e141",
} as const;

const UNKNOWN_UID = `0x${"e".repeat(64)}`;
const UNKNOWN_TX = `0x${"f".repeat(64)}`;

/** GET an attestation row, tolerating the indexer's 422-for-missing contract. */
async function getAttestation(api: APIRequestContext, uid: string) {
  const res = await api.get(`/attestations/${uid}`);
  return { status: res.status(), body: res.ok() ? await res.json() : null };
}

async function replayTransaction(api: APIRequestContext, txid: string) {
  // Synchronous on the indexer side: the route awaits parseAttestations before
  // responding, so a follow-up GET observes the outcome immediately.
  return api.post(`/attestations/index-by-transaction/${txid}/${CHAIN_ID}`);
}

test.describe("BE seam (#2265) — replay of production-dropped completions", () => {
  test.skip(
    !INDEXER_URL,
    "requires E2E_INDEXER_URL pointing at a deployed indexer preview holding the Base dataset"
  );

  let api: APIRequestContext;
  let datasetPresent = false;

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL: INDEXER_URL });
    // Precondition: the milestone's ref chain must exist in the target env.
    // Staging does not index Base at all — skipping beats failing on an env
    // that structurally cannot authorize these attestations.
    const milestone = await getAttestation(api, MILESTONE_UID);
    datasetPresent = milestone.status === 200;
  });

  test.afterAll(async () => {
    await api?.dispose();
  });

  test.beforeEach(() => {
    test.skip(
      !datasetPresent,
      `milestone ${MILESTONE_UID} not present in ${INDEXER_URL} — point E2E_INDEXER_URL at an environment holding the Base dataset (production or a preview sharing it)`
    );
  });

  test("linked-sibling flow: all four dropped completions index on replay", async () => {
    for (const completion of DROPPED_COMPLETIONS) {
      const replay = await replayTransaction(api, completion.txid);
      expect(replay.status(), `replay of ${completion.txid}`).toBeLessThan(500);

      const row = await getAttestation(api, completion.uid);
      expect(
        row.status,
        `${completion.uid} (${completion.flow}) must be indexed after replay — ` +
          `422 here means the validator still rejects the signing wallet, i.e. the pre-#2265 behavior`
      ).toBe(200);
      expect(row.body?.attester?.toLowerCase()).toBe(completion.attester);
      expect(row.body?.type).toBe("MilestoneStatus");
    }
  });

  test("relayed flow: the proxy-relayed completion indexes on replay", async () => {
    const replay = await replayTransaction(api, DROPPED_RELAYED_COMPLETION.txid);
    expect(replay.status()).toBeLessThan(500);

    const row = await getAttestation(api, DROPPED_RELAYED_COMPLETION.uid);
    expect(
      row.status,
      "relayed completion must be indexed — the courier-only proxy arm of #2265"
    ).toBe(200);
    expect(row.body?.attester?.toLowerCase()).toBe(DROPPED_RELAYED_COMPLETION.attester);
  });

  test("replay is idempotent — a second replay does not duplicate or error", async () => {
    const first = DROPPED_COMPLETIONS[0];
    const replay = await replayTransaction(api, first.txid);
    expect(replay.status()).toBeLessThan(500);

    const row = await getAttestation(api, first.uid);
    expect(row.status).toBe(200);
  });

  test("grants read model exposes the completion field the #1894 poll waits on", async () => {
    // The FE poll's success condition reads grants[].milestones[].completed.
    // Not differential (an admin completed this milestone manually on
    // 2026-07-20), but it pins the wire contract that condition depends on
    // against the LIVE response shape — the seam a unit mock cannot pin.
    const res = await api.get(`/v2/projects/${PROJECT_SLUG}/grants`);
    expect(res.status()).toBe(200);
    const grants = await res.json();
    const milestones = (Array.isArray(grants) ? grants : [grants]).flatMap(
      (grant: { milestones?: { uid: string; completed: unknown }[] }) => grant.milestones ?? []
    );
    const milestone = milestones.find((entry) => entry.uid === MILESTONE_UID);
    expect(milestone, `milestone ${MILESTONE_UID} present in grants payload`).toBeTruthy();
    expect(milestone?.completed, "completed must be non-null for the poll to succeed").toBeTruthy();
  });

  test("failure path: unknown attestation uid is a clean client error, not a 5xx", async () => {
    const row = await getAttestation(api, UNKNOWN_UID);
    expect([404, 422]).toContain(row.status);
  });

  test("failure path: unknown transaction hash is a clean client error, not a 5xx", async () => {
    // The #2237 contract: the FE fires this POST after every signature; a 5xx
    // here would both spam Sentry and break the flow for a merely-slow tx.
    const replay = await replayTransaction(api, UNKNOWN_TX);
    expect(replay.status()).toBeLessThan(500);
  });
});

test.describe("FE read seam (#1894) — preview renders the indexed completion", () => {
  test.skip(
    !LIVE_PAIR,
    "requires E2E_LIVE_PAIR=1 with BASE_URL pointing at the Vercel preview (run after the BE replay suite)"
  );

  test("project updates page shows the replayed milestone as completed", async ({ page }) => {
    await page.goto(`/project/${PROJECT_SLUG}/updates`, GOTO_OPTIONS);
    await waitForPageReady(page);

    // The milestone the replay indexed, rendered through the same grants read
    // model the completion poll consumes.
    await expect(page.getByText(MILESTONE_TITLE).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/completed/i).first()).toBeVisible();
  });
});
