import { MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

// These community subpages rely on SSR data fetching. Playwright route mocks
// only intercept browser requests, so we use "optimism" — a real community
// slug that exists in the staging indexer — to keep SSR happy while still
// exercising the page shell and client components.
const COMMUNITY_SLUG = MOCK_COMMUNITIES.optimism.slug;

/**
 * Smoke coverage for the four community subpages the product surfaces
 * (projects, grants, updates, stats) across both URL shapes that the
 * middleware supports:
 *
 *   1. Standard host:  karmahq.xyz/community/<slug>/<page>
 *   2. Whitelabel host: app.opgrants.io/<page>  (rewritten by middleware)
 *
 * The whitelabel variants also act as regression tests for the slim
 * <WhitelabelNavbar/> SDK module-graph bug fixed in d8e1e67d, where the
 * first SDK deep-import on /updates crashed render with
 * "Class extends value undefined is not a constructor or null".
 * collectJsErrors / assertNoJsErrors will surface that class of failure.
 */
test.describe("Smoke Tests — Community Pages", () => {
  test.describe("Standard host (/community/:slug/...)", () => {
    test("T-COMM-01: /community/:slug/projects loads", async ({ page, withApiMocks }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        [`**/v2/communities/${COMMUNITY_SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
        [`**/v2/funding-program-configs/community/${COMMUNITY_SLUG}**`]: mockJson([
          createMockProgram({ title: "Retro Funding" }),
        ]),
      });

      await page.goto(`/community/${COMMUNITY_SLUG}/projects`, GOTO_OPTIONS);
      await waitForPageReady(page);

      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });

      assertNoJsErrors(jsErrors);
    });

    test("T-COMM-02: /community/:slug/grants redirects to /funding-opportunities", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        [`**/v2/communities/${COMMUNITY_SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
        [`**/v2/funding-program-configs/community/${COMMUNITY_SLUG}**`]: mockJson([
          createMockProgram({ title: "Open Funding" }),
        ]),
      });

      await page.goto(`/community/${COMMUNITY_SLUG}/grants`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // next.config.ts:148 permanently redirects /community/:slug/grants -> /funding-opportunities
      await expect(page).toHaveURL(/\/funding-opportunities\/?$/);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });

      assertNoJsErrors(jsErrors);
    });

    test("T-COMM-03: /community/:slug/updates loads", async ({ page, withApiMocks }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        [`**/v2/communities/${COMMUNITY_SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
        [`**/v2/communities/${COMMUNITY_SLUG}/project-updates**`]: mockJson({
          payload: [],
          pagination: { page: 1, limit: 25, total: 0 },
        }),
        [`**/v2/communities/${COMMUNITY_SLUG}/projects**`]: mockJson({
          payload: [],
          pagination: { page: 1, limit: 25, total: 0 },
        }),
        [`**/v2/communities/${COMMUNITY_SLUG}/milestone-allocations**`]: mockJson([]),
      });

      await page.goto(`/community/${COMMUNITY_SLUG}/updates`, GOTO_OPTIONS);
      await waitForPageReady(page);

      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });

      assertNoJsErrors(jsErrors);
    });

    test("T-COMM-04: /community/:slug/stats renders without crashing", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        [`**/v2/communities/${COMMUNITY_SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
        [`**/v2/communities/${COMMUNITY_SLUG}/stats`]: mockJson(MOCK_COMMUNITIES.optimism.stats),
      });

      await page.goto(`/community/${COMMUNITY_SLUG}/stats`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // /community/:slug/stats is not a defined route today — the app should
      // handle it gracefully (not-found page or future stats content) with no
      // JS errors.
      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });

      assertNoJsErrors(jsErrors);
    });
  });

  test.describe("Whitelabel host (clean URLs, middleware rewrite)", () => {
    test("T-COMM-WL-01: /projects loads on whitelabel domain", async ({
      page,
      withApiMocks,
      withTenant,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withTenant("optimism");
      await withApiMocks({
        [`**/v2/communities/${COMMUNITY_SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
        [`**/v2/funding-program-configs/community/${COMMUNITY_SLUG}**`]: mockJson([
          createMockProgram({ title: "Retro Funding" }),
        ]),
      });

      // Whitelabel clean URL — middleware rewrites to /community/optimism/projects
      await page.goto("/projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });

      // Browser URL must stay on the clean whitelabel path
      expect(new URL(page.url()).pathname).not.toContain("/community/");

      assertNoJsErrors(jsErrors);
    });

    test("T-COMM-WL-02: /grants on whitelabel domain renders without crashing", async ({
      page,
      withApiMocks,
      withTenant,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withTenant("optimism");
      await withApiMocks({
        [`**/v2/communities/${COMMUNITY_SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
        [`**/v2/funding-program-configs/community/${COMMUNITY_SLUG}**`]: mockJson([
          createMockProgram({ title: "Open Funding" }),
        ]),
      });

      // /grants is NOT in COMMUNITY_SUB_ROUTE_SEGMENTS, so on whitelabel it passes
      // through as a top-level route. Whatever the app serves (404 shell or
      // future route) must render without throwing.
      await page.goto("/grants", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });

      assertNoJsErrors(jsErrors);
    });

    test("T-COMM-WL-03: /updates loads on whitelabel domain (regression: d8e1e67d)", async ({
      page,
      withApiMocks,
      withTenant,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withTenant("optimism");
      await withApiMocks({
        [`**/v2/communities/${COMMUNITY_SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
        [`**/v2/communities/${COMMUNITY_SLUG}/project-updates**`]: mockJson({
          payload: [],
          pagination: { page: 1, limit: 25, total: 0 },
        }),
        [`**/v2/communities/${COMMUNITY_SLUG}/projects**`]: mockJson({
          payload: [],
          pagination: { page: 1, limit: 25, total: 0 },
        }),
        [`**/v2/communities/${COMMUNITY_SLUG}/milestone-allocations**`]: mockJson([]),
      });

      // Whitelabel clean URL — middleware rewrites to /community/optimism/updates.
      // This is the page that threw "Class extends value undefined is not a
      // constructor or null" before the slim <WhitelabelNavbar/> was primed
      // with a bare `import "@show-karma/karma-gap-sdk"`. jsErrors captures
      // that exact failure mode.
      await page.goto("/updates", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });

      expect(new URL(page.url()).pathname).not.toContain("/community/");

      // Assert the specific SDK-init error class does NOT surface, in addition
      // to the general "no JS errors" guard.
      const sdkInitError = jsErrors.find((msg) =>
        /Class extends value undefined|is not a constructor/i.test(msg)
      );
      expect(sdkInitError).toBeUndefined();

      assertNoJsErrors(jsErrors);
    });

    test("T-COMM-WL-04: /stats on whitelabel domain renders without crashing", async ({
      page,
      withApiMocks,
      withTenant,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withTenant("optimism");
      await withApiMocks({
        [`**/v2/communities/${COMMUNITY_SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
        "**/v2/communities/stats**": mockJson({
          totalCommunities: 5,
          totalProjects: 100,
          totalGrants: 50,
        }),
      });

      // /stats is not in COMMUNITY_SUB_ROUTE_SEGMENTS — on whitelabel it passes
      // through as a top-level route and hits the global /stats page.
      await page.goto("/stats", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });

      assertNoJsErrors(jsErrors);
    });
  });
});
