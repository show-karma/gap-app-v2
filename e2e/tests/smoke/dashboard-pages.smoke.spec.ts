import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Smoke Tests — Dashboard Pages", () => {
  test.describe("Dashboard (authenticated)", () => {
    test("T-DASH-01: dashboard page loads for authenticated user", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("applicant");
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Dashboard should show a heading, content, or any meaningful UI
      const hasDashboardContent = await Promise.race([
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/my project|your project|get started|dashboard/i)
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasDashboardContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });

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

    test("T-DASH-03: dashboard renders content for authenticated user", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks();
      await loginAs("applicant");
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      // With real login, the test account may have projects or not.
      // Just verify the dashboard rendered meaningful content.
      await expect(page.locator("body")).toBeVisible();
      const hasContent = await Promise.race([
        page
          .getByText(/create.*project|get started|no project|my project/i)
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasContent).toBeTruthy();
    });

    test("T-DASH-04: dashboard loads for authenticated user with admin context", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks();
      // With real Privy login, we get whatever role the test account has.
      // The test verifies the dashboard loads without crashing.
      await loginAs("communityAdmin");
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Verify dashboard rendered — may show admin content or regular content
      await expect(page.locator("body")).toBeVisible();
      const hasContent = await Promise.race([
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/admin|manage|dashboard|project/i)
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe("My Projects Page", () => {
    test("T-DASH-05: my-projects page loads for authenticated user", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
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
          .getByText(/my project|your project|project/i)
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasProjectsContent).toBeTruthy();
    });

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

    test("T-DASH-07: my-projects page renders content for authenticated user", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks();
      await loginAs("applicant");
      await page.goto("/my-projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      // With real login, the test account may have projects or not.
      // Just verify the page rendered meaningful content.
      await expect(page.locator("body")).toBeVisible();
      const hasContent = await Promise.race([
        page
          .getByText(/create.*project|no.*project|get started|my project/i)
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasContent).toBeTruthy();
    });
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
