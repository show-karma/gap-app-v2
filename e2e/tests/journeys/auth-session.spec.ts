import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Journey — Auth Session", () => {
  test.describe("Unauthenticated Access", () => {
    test("J-AUTH-01: unauthenticated user on dashboard sees sign-in prompt or redirect", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks();
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      const showsAuthPrompt = await page
        .getByText(/sign in|connect wallet|log in/i)
        .first()
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      const wasRedirected = !page.url().includes("/dashboard");

      expect(showsAuthPrompt || wasRedirected).toBeTruthy();
    });

    test("J-AUTH-02: unauthenticated user on my-projects sees auth prompt or redirect", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks();
      await page.goto("/my-projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      const showsAuthPrompt = await page
        .getByText(/sign in|connect.*wallet|log in/i)
        .first()
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      const wasRedirected = !page.url().includes("/my-projects");

      expect(showsAuthPrompt || wasRedirected).toBeTruthy();
    });

    test("J-AUTH-03: public pages are accessible without authentication", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/stats**": mockJson({
          totalCommunities: 5,
          totalProjects: 100,
          totalGrants: 50,
        }),
      });

      await page.goto("/communities", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Public page should load with content
      const hasContent = await Promise.race([
        page
          .getByRole("heading", { name: /communit/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/communit/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });
  });

  test.describe("Authenticated Access", () => {
    test("J-AUTH-04: authenticated user can access dashboard", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks({
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
        "**/v2/user/communities/admin**": mockJson([]),
        "**/v2/funding-program-configs/my-reviewer-programs**": mockJson([]),
      });
      await loginAs("applicant");
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show dashboard content, not a sign-in prompt
      const hasDashboardContent = await Promise.race([
        page
          .getByRole("heading", { name: /dashboard/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/my project|your project|get started/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasDashboardContent).toBeTruthy();

      // Should NOT show a sign-in prompt
      const url = page.url();
      expect(url).toContain("/dashboard");
    });

    test("J-AUTH-05: authenticated user can access my-projects page", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks({
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
      });
      await loginAs("applicant");
      await page.goto("/my-projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show projects content
      const hasProjectsContent = await Promise.race([
        page
          .getByText(/my project|your project/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasProjectsContent).toBeTruthy();
    });

    test("J-AUTH-06: super admin can access dashboard with elevated permissions", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
        "**/v2/user/communities/admin**": mockJson([]),
        "**/v2/funding-program-configs/my-reviewer-programs**": mockJson([]),
      });
      await loginAs("superAdmin");
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Dashboard should load for super admin
      const hasDashboardContent = await Promise.race([
        page
          .getByRole("heading", { name: /dashboard/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/my project|your project|get started/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/admin|manage/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasDashboardContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });
  });
});
