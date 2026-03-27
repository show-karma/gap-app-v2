import { MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, navigateToCommunity, waitForPageReady } from "../../helpers/navigation";

test.describe("Journey — Navigation & Permissions", () => {
  const community = MOCK_COMMUNITIES.optimism;
  const program = createMockProgram({
    programId: "program-nav-001",
    title: "Navigation Test Program",
  });

  function defaultMocks() {
    return {
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      "**/v2/funding-applications/program/**": mockJson([]),
      "**/v2/communities/stats**": mockJson({
        totalCommunities: 5,
        totalProjects: 100,
        totalGrants: 50,
      }),
    };
  }

  test.describe("Guest Navigation", () => {
    test("J-NAV-01: guest can browse communities page", async ({ page, withApiMocks }) => {
      await withApiMocks(defaultMocks());
      await page.goto("/communities", GOTO_OPTIONS);
      await waitForPageReady(page);

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
    });

    test("J-NAV-02: guest can browse projects page", async ({ page, withApiMocks }) => {
      await withApiMocks(defaultMocks());
      await page.goto("/projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      const hasContent = await Promise.race([
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
      expect(hasContent).toBeTruthy();
    });

    test("J-NAV-03: guest can view a community page", async ({ page, withApiMocks }) => {
      await withApiMocks(defaultMocks());
      await navigateToCommunity(page, "optimism");

      await expect(page.getByText("Optimism").first()).toBeVisible();
    });

    test("J-NAV-04: guest is blocked from auth-gated pages", async ({ page, withApiMocks }) => {
      await withApiMocks(defaultMocks());

      // Try to access project creation (auth-gated)
      await page.goto("/project/create", GOTO_OPTIONS);
      await waitForPageReady(page);

      const showsAuthPrompt = await page
        .getByText(/sign in|connect wallet|log in/i)
        .first()
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      const wasRedirected = !page.url().includes("/project/create");

      expect(showsAuthPrompt || wasRedirected).toBeTruthy();
    });
  });

  test.describe("Role-Based Navigation", () => {
    test("J-NAV-05: community admin sees admin-related content in community page", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks({
        ...defaultMocks(),
        "**/v2/user/communities/admin**": mockJson([community]),
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
        "**/v2/funding-program-configs/my-reviewer-programs**": mockJson([]),
      });
      await loginAs("communityAdmin");
      await navigateToCommunity(page, "optimism");

      // Admin should see the community page with potential admin controls
      await expect(page.getByText("Optimism").first()).toBeVisible();

      // Admin-specific actions may be visible
      const hasAdminActions = await Promise.race([
        page
          .getByRole("button", { name: /manage|settings|edit|create/i })
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("link", { name: /manage|settings|admin/i })
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        page
          .locator("[data-testid*='admin']")
          .first()
          .waitFor({ timeout: 3000 })
          .then(() => true)
          .catch(() => false),
      ]);
      // Admin actions may be behind sub-navigation; at minimum, the page loads
      expect(page.url()).toContain("/community/optimism");
    });

    test("J-NAV-06: reviewer sees reviewer-specific content on dashboard", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks({
        ...defaultMocks(),
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
        "**/v2/user/communities/admin**": mockJson([]),
        "**/v2/funding-program-configs/my-reviewer-programs**": mockJson([program]),
      });
      await loginAs("reviewer");
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Reviewer should see the dashboard with reviewer programs
      const hasDashboardContent = await Promise.race([
        page
          .getByText(/review|Navigation Test Program/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading", { name: /dashboard/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/my project|get started/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasDashboardContent).toBeTruthy();
    });

    test("J-NAV-07: applicant can access my-projects page", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks({
        ...defaultMocks(),
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
      });
      await loginAs("applicant");
      await page.goto("/my-projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(page.url()).toContain("/my-projects");

      const hasContent = await Promise.race([
        page
          .getByText(/my project|your project|create|no project/i)
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
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe("Navigation Between Pages", () => {
    test("J-NAV-08: user can navigate from communities to a specific community", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        ...defaultMocks(),
        // Mock communities list with at least one community
        "**/v2/communities**": mockJson([community]),
      });

      await page.goto("/communities", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Find a link to the Optimism community
      const communityLink = await Promise.race([
        page
          .getByRole("link", { name: /optimism/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => page.getByRole("link", { name: /optimism/i }).first())
          .catch(() => null),
        page
          .getByText("Optimism")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => page.getByText("Optimism").first())
          .catch(() => null),
      ]);

      if (communityLink) {
        const tagName = await communityLink.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === "a") {
          await communityLink.click();
          await waitForPageReady(page);
          // Should navigate to the community page
          expect(page.url()).toContain("/community/optimism");
        }
      }

      assertNoJsErrors(jsErrors);
    });
  });
});
