import type { Page } from "@playwright/test";
import { expect, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

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

  const showsDenialText = await page
    .getByText(
      /sign in|connect wallet|log in|access denied|not authorized|forbidden|only.*admin.*can view|isnt.*admin|need to be an admin/i
    )
    .first()
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  const showsAuthButton = await page
    .getByRole("button", { name: /sign in|connect|log in/i })
    .first()
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  expect(wasRedirected || showsDenialText || showsAuthButton).toBeTruthy();
}

test.describe("Smoke Tests @smoke — RBAC Access Control", () => {
  test.describe("Guest access gates", () => {
    test("T-RBAC-01: guest accessing /dashboard gets auth prompt", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks();
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/dashboard");
    });

    test("T-RBAC-02: guest accessing /my-projects gets auth prompt", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks();
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
      await withApiMocks();
      await page.goto("/community/optimism/manage", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/community/optimism/manage");
    });

    test("T-RBAC-10: guest accessing /community/optimism/manage/funding-platform gets denied", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks();
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
      await withApiMocks();
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
      await withApiMocks();
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
      await withApiMocks();
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
      await withApiMocks();
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
      await withApiMocks();
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
      await withApiMocks();
      await loginAs("programAdmin");
      await page.goto("/super-admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expectAccessBlocked(page, "/super-admin");
    });
  });
});
