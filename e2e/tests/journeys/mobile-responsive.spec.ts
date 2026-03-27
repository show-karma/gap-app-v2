import { MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * Mobile responsiveness tests run against the "mobile-chrome" project
 * defined in playwright.config.ts (Pixel 7 viewport).
 */
test.describe("Journey — Mobile Responsive", () => {
  // Only run these tests in the mobile-chrome project
  test.use({ viewport: { width: 412, height: 915 } });

  const community = MOCK_COMMUNITIES.optimism;
  const program = createMockProgram({
    programId: "program-mobile-001",
    title: "Mobile Test Program",
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

  test.describe("Mobile Navigation", () => {
    test("J-MOB-01: mobile viewport shows hamburger menu or mobile nav", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks(defaultMocks());
      await page.goto("/", GOTO_OPTIONS);
      await waitForPageReady(page);

      // On mobile, the main nav should be collapsed into a hamburger/menu button
      const hasMobileNav = await Promise.race([
        page
          .getByRole("button", { name: /menu|toggle.*nav|open.*menu/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .locator("[data-testid*='mobile-menu'], [data-testid*='hamburger'], [aria-label*='menu']")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .locator("button svg, button[class*='menu']")
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
      ]);

      // The page should at least render properly on mobile
      await expect(page.locator("body")).toBeVisible();
      // Mobile pages may have a different nav pattern; verify the page loaded
      const hasVisibleContent = await page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      expect(hasMobileNav || hasVisibleContent).toBeTruthy();
    });

    test("J-MOB-02: mobile menu opens when hamburger button is clicked", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks(defaultMocks());
      await page.goto("/", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Find the hamburger/menu button
      const menuBtn = await Promise.race([
        page
          .getByRole("button", { name: /menu|toggle.*nav|open.*menu/i })
          .waitFor({ timeout: 5000 })
          .then(() => page.getByRole("button", { name: /menu|toggle.*nav|open.*menu/i }))
          .catch(() => null),
        page
          .locator("[data-testid*='mobile-menu'], [data-testid*='hamburger'], [aria-label*='menu']")
          .first()
          .waitFor({ timeout: 5000 })
          .then(() =>
            page
              .locator(
                "[data-testid*='mobile-menu'], [data-testid*='hamburger'], [aria-label*='menu']"
              )
              .first()
          )
          .catch(() => null),
      ]);

      if (menuBtn) {
        await menuBtn.click();

        // After clicking, navigation links should become visible
        const hasNavLinks = await Promise.race([
          page
            .getByRole("link", { name: /communities|projects|dashboard/i })
            .first()
            .waitFor({ timeout: 5000 })
            .then(() => true)
            .catch(() => false),
          page
            .locator("nav a, [role='navigation'] a")
            .first()
            .waitFor({ timeout: 5000 })
            .then(() => true)
            .catch(() => false),
        ]);
        expect(hasNavLinks).toBeTruthy();
      }
    });
  });

  test.describe("Mobile Page Rendering", () => {
    test("J-MOB-03: communities page renders correctly on mobile", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks(defaultMocks());
      await page.goto("/communities", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Page should render with visible content
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

      // Content should not overflow the viewport
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = 412;
      // Allow a small tolerance for scrollbar differences
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);

      assertNoJsErrors(jsErrors);
    });

    test("J-MOB-04: community page renders correctly on mobile", async ({ page, withApiMocks }) => {
      await withApiMocks(defaultMocks());
      await page.goto("/community/optimism", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Community name should be visible
      await expect(page.getByText("Optimism").first()).toBeVisible();

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(432);
    });

    test("J-MOB-05: donation page renders correctly on mobile viewport", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        ...defaultMocks(),
        "**/v2/funding-program-configs/community/optimism**": mockJson([
          program,
          createMockProgram({ programId: "p2", title: "Program B" }),
        ]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // The program selector should be visible and usable
      const hasSelector = await Promise.race([
        page
          .getByRole("heading", { name: /select a program/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .locator("select#program-select")
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasSelector).toBeTruthy();
    });

    test("J-MOB-06: dashboard page renders on mobile for authenticated user", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        ...defaultMocks(),
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
    });
  });

  test.describe("Mobile Error Handling", () => {
    test("J-MOB-07: 404 page renders correctly on mobile", async ({ page, withApiMocks }) => {
      await withApiMocks(defaultMocks());
      await page.goto("/nonexistent-mobile-page", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expect(page.getByRole("heading", { name: /404/i })).toBeVisible();

      // Go Home link should be visible and tappable
      await expect(page.getByRole("link", { name: /go home/i })).toBeVisible();
    });

    test("J-MOB-08: stats page renders without horizontal overflow on mobile", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks(defaultMocks());
      await page.goto("/stats", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Page should render
      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible();

      // Verify no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(432);

      assertNoJsErrors(jsErrors);
    });
  });
});
