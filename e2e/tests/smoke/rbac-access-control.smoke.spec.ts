import type { Page } from "@playwright/test";
import { expect, test } from "../../fixtures";
import { mockJson } from "../../fixtures/api-mocks";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

// The pages this suite guards block their denial UI behind data loads the
// default mock set doesn't cover: /community/:id/manage waits on the
// community-details lookup, and /admin fans out to the full communities
// list plus one admins request per community. Left unmocked, those calls
// hit the real staging indexer — which shares CI with the QA pipeline's
// load — and the denial UI can sit behind a skeleton past this suite's
// wait budget. Mock them so denial renders deterministically.
const RBAC_ROUTE_MOCKS = {
  "**/v2/communities/optimism": mockJson({
    uid: "0x0000000000000000000000000000000000000000000000000000000000000001",
    chainID: 10,
    details: { name: "Optimism", slug: "optimism" },
  }),
  "**/v2/communities?**": mockJson({ payload: [], pagination: { page: 1, limit: 100, total: 0 } }),
};

/**
 * Checks whether a protected page blocked access for the current user.
 *
 * Access is considered blocked when ANY of the following is true:
 * 1. The URL no longer contains the original path (redirect occurred).
 * 2. The page shows auth/denial text (sign in, access denied, etc.).
 * 3. A sign-in / connect button is visible.
 */
async function expectAccessBlocked(page: Page, originalPath: string): Promise<void> {
  const wasRedirected = !page.url().includes(originalPath);

  // Probed in parallel with a generous budget: the denial UI renders only
  // after the page's permission/data queries settle, which under CI load
  // can take well past a nominal render.
  const [showsDenialText, showsAuthButton] = await Promise.all([
    page
      .getByText(
        // Covers both the legacy "Access Denied / not authorized" copy and the
        // RBAC-aware copy introduced by PR #1441 ("You're almost there / needs
        // a role your account doesn't have yet / Reach out to ... admin").
        /sign in|connect wallet|log in|access denied|not authorized|forbidden|only.*admin.*can view|isnt.*admin|need to be an admin|almost there|needs a role|reach out to/i
      )
      .first()
      .waitFor({ timeout: 15000 })
      .then(() => true)
      .catch(() => false),
    page
      .getByRole("button", { name: /sign in|connect|log in/i })
      .first()
      .waitFor({ timeout: 15000 })
      .then(() => true)
      .catch(() => false),
  ]);

  expect(wasRedirected || showsDenialText || showsAuthButton).toBeTruthy();
}

test.describe("Smoke Tests @smoke — RBAC Access Control", () => {
  test.describe("Guest access gates", () => {
    // Guest tests must run without auth — override storageState from setup project
    test.use({ storageState: { cookies: [], origins: [] } });

    test("T-RBAC-01: guest accessing /dashboard gets auth prompt", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/dashboard");
    });

    test("T-RBAC-02: guest accessing /my-projects gets auth prompt", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await page.goto("/my-projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      // /my-projects is middleware-redirected to /dashboard#projects for all users.
      // Assert access is blocked on the redirected destination instead.
      await expectAccessBlocked(page, "/dashboard");
    });

    test("T-RBAC-03: guest accessing /community/optimism/manage gets denied", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await page.goto("/community/optimism/manage", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/community/optimism/manage");
    });

    test("T-RBAC-10: guest accessing /community/optimism/manage/funding-platform gets denied", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await page.goto("/community/optimism/manage/funding-platform", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/community/optimism/manage/funding-platform");
    });
  });

  test.describe("Applicant privilege boundaries", () => {
    test("T-RBAC-04: applicant accessing /community/optimism/manage gets denied", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await loginAs("applicant");
      await page.goto("/community/optimism/manage", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/community/optimism/manage");
    });

    test("T-RBAC-05: applicant accessing /admin gets denied", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await loginAs("applicant");
      await page.goto("/admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/admin");
    });
  });

  test.describe("Role escalation boundaries", () => {
    test("T-RBAC-06: communityAdmin accessing /super-admin gets denied", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await loginAs("communityAdmin");
      await page.goto("/super-admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/super-admin");
    });

    test("T-RBAC-07: communityAdmin accessing /admin gets denied", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await loginAs("communityAdmin");
      await page.goto("/admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/admin");
    });

    test("T-RBAC-08: reviewer accessing /admin gets denied", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await loginAs("reviewer");
      await page.goto("/admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/admin");
    });

    test("T-RBAC-09: programAdmin accessing /super-admin gets denied", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks(RBAC_ROUTE_MOCKS);
      await loginAs("programAdmin");
      await page.goto("/super-admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/super-admin");
    });
  });
});
