import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

// Admin pages check contract ownership (isOwner) via RPC calls that can't be
// mocked through Playwright route interception. Pages render either admin content
// (if isOwner or isSuperAdmin) or a "not admin" message, or redirect. All are
// valid smoke test outcomes — we're verifying the page loads without crashing.
async function adminContentCheck(page: import("@playwright/test").Page, expectedPath: string) {
  // Server-side redirects are valid — SSR sees real user permissions, not mocked ones
  const wasRedirected = !page.url().includes(expectedPath);
  if (wasRedirected) return true;

  const [hasHeading, hasText] = await Promise.all([
    page
      .getByRole("heading")
      .first()
      .waitFor({ timeout: 10000 })
      .then(() => true)
      .catch(() => false),
    page
      .getByText(/admin|communities|projects|super admin|isnt|need to be/i)
      .first()
      .waitFor({ timeout: 10000 })
      .then(() => true)
      .catch(() => false),
  ]);

  return hasHeading || hasText;
}

test.describe("Smoke Tests — Admin Pages", () => {
  test.describe("Admin Pages", () => {
    test("T-ADM-01: admin landing page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
      });
      await loginAs("superAdmin");
      await page.goto("/admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });

    test("T-ADM-02: admin communities page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/admin/communities", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin/communities")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });

    test("T-ADM-03: admin communities stats page loads", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/admin/communities/stats", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin/communities/stats")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });

    test("T-ADM-04: admin projects page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/admin/projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin/projects")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });
  });

  test.describe("Super Admin Pages", () => {
    test("T-ADM-05: admin faucet page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/admin/faucet", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin/faucet")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });

    test("T-ADM-06: super-admin page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/super-admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/super-admin")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });
  });
});
