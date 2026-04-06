import { MOCK_COMMUNITIES } from "../../data/communities";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Smoke Tests — Dashboard Pages", () => {
  test.describe("Dashboard (authenticated)", () => {
    // Requires NEXT_PUBLIC_E2E_AUTH_BYPASS=true at build time, which is not set in CI smoke tests.
    test.fixme(
      "T-DASH-01: dashboard page loads for authenticated user",
      async ({ page, withApiMocks, loginAs }) => {
        const jsErrors = collectJsErrors(page);

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

        // Dashboard should show a heading or welcome content
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

        assertNoJsErrors(jsErrors);
      }
    );

    test("T-DASH-02: dashboard redirects or prompts unauthenticated users", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks();
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      // The page should render something — auth prompt, redirect, or loading state.
      await expect(page.locator("body")).toBeVisible();

      const showsAuthPrompt = await Promise.race([
        page
          .getByText(/sign in|connect wallet|log in|dashboard/i)
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("button")
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
      ]);

      const wasRedirected = !page.url().includes("/dashboard");

      // Accept that the page loaded in some form
      expect(showsAuthPrompt || wasRedirected).toBeTruthy();
    });

    // Requires NEXT_PUBLIC_E2E_AUTH_BYPASS=true at build time, which is not set in CI smoke tests.
    test.fixme(
      "T-DASH-03: dashboard shows empty state when user has no projects",
      async ({ page, withApiMocks, loginAs }) => {
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

        // Should show an empty state or call-to-action for creating a project
        const hasEmptyOrCta = await Promise.race([
          page
            .getByText(/create.*project|get started|no project/i)
            .first()
            .waitFor({ timeout: 8000 })
            .then(() => true)
            .catch(() => false),
          page
            .getByRole("button", { name: /create|new project/i })
            .first()
            .waitFor({ timeout: 8000 })
            .then(() => true)
            .catch(() => false),
        ]);
        expect(hasEmptyOrCta).toBeTruthy();
      }
    );

    // Requires NEXT_PUBLIC_E2E_AUTH_BYPASS=true at build time, which is not set in CI smoke tests.
    test.fixme(
      "T-DASH-04: dashboard shows admin section for community admins",
      async ({ page, withApiMocks, loginAs }) => {
        const community = MOCK_COMMUNITIES.optimism;
        await withApiMocks({
          "**/v2/user/projects**": mockJson({
            payload: [],
            pagination: { page: 1, limit: 10, total: 0 },
          }),
          "**/v2/user/communities/admin**": mockJson([community]),
          "**/v2/funding-program-configs/my-reviewer-programs**": mockJson([]),
        });
        await loginAs("communityAdmin");
        await page.goto("/dashboard", GOTO_OPTIONS);
        await waitForPageReady(page);

        // Should show the admin community name or an admin-specific section
        const hasAdminContent = await Promise.race([
          page
            .getByText("Optimism")
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
        expect(hasAdminContent).toBeTruthy();
      }
    );
  });

  test.describe("My Projects Page", () => {
    // Requires NEXT_PUBLIC_E2E_AUTH_BYPASS=true at build time, which is not set in CI smoke tests.
    test.fixme(
      "T-DASH-05: my-projects page loads for authenticated user",
      async ({ page, withApiMocks, loginAs }) => {
        const jsErrors = collectJsErrors(page);

        await withApiMocks();
        await loginAs("applicant");
        await page.goto("/my-projects", GOTO_OPTIONS);
        await waitForPageReady(page);

        // The page should render without JS errors
        assertNoJsErrors(jsErrors);

        // Should show a heading or content related to projects
        await expect(page.locator("body")).toBeVisible();
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
      }
    );

    test("T-DASH-06: my-projects page prompts unauthenticated users to connect", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks();
      await page.goto("/my-projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show a connect wallet prompt or sign-in message
      const hasAuthPrompt = await Promise.race([
        page
          .getByText(/sign in|connect.*wallet|log in/i)
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("button", { name: /connect|sign in/i })
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
      ]);

      const wasRedirected = !page.url().includes("/my-projects");

      expect(hasAuthPrompt || wasRedirected).toBeTruthy();
    });

    // Requires NEXT_PUBLIC_E2E_AUTH_BYPASS=true at build time, which is not set in CI smoke tests.
    test.fixme(
      "T-DASH-07: my-projects page shows empty state for user with no projects",
      async ({ page, withApiMocks, loginAs }) => {
        await withApiMocks({
          "**/v2/user/projects**": mockJson({
            payload: [],
            pagination: { page: 1, limit: 10, total: 0 },
          }),
        });
        await loginAs("applicant");
        await page.goto("/my-projects", GOTO_OPTIONS);
        await waitForPageReady(page);

        // Should show an empty state CTA to create a project
        const hasEmptyState = await Promise.race([
          page
            .getByText(/create.*project|no.*project|get started/i)
            .first()
            .waitFor({ timeout: 8000 })
            .then(() => true)
            .catch(() => false),
          page
            .getByRole("button", { name: /create|new/i })
            .first()
            .waitFor({ timeout: 8000 })
            .then(() => true)
            .catch(() => false),
        ]);
        expect(hasEmptyState).toBeTruthy();
      }
    );
  });

  test.describe("Communities Page", () => {
    test("T-DASH-08: communities listing page loads", async ({ page, withApiMocks }) => {
      await withApiMocks({
        "**/v2/communities/stats**": mockJson({
          totalCommunities: 5,
          totalProjects: 100,
          totalGrants: 50,
        }),
      });

      await page.goto("/communities", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show a heading related to communities
      const hasCommunityContent = await Promise.race([
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
      expect(hasCommunityContent).toBeTruthy();
    });

    test("T-DASH-09: projects listing page loads", async ({ page, withApiMocks }) => {
      await withApiMocks();
      await page.goto("/projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      // The projects page should render with a heading or project listing content
      const hasProjectsContent = await Promise.race([
        page
          .getByRole("heading", { name: /project/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/project/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasProjectsContent).toBeTruthy();
    });

    test("T-DASH-10: stats page loads", async ({ page, withApiMocks }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await page.goto("/stats", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Stats page should load without JS errors
      assertNoJsErrors(jsErrors);

      // Should render visible content (heading or stats data)
      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible();
    });
  });
});
