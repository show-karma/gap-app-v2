import { MOCK_COMMUNITIES } from "../../data/communities";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Smoke Tests — Error Pages", () => {
  test.describe("Global 404 Page", () => {
    test("T-ERR-01: navigating to a non-existent route shows 404 page", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await page.goto("/this-route-does-not-exist-xyz", GOTO_OPTIONS);
      await waitForPageReady(page);

      // The global 404 page should show "404 - Page Not Found"
      await expect(page.getByRole("heading", { name: /404/i })).toBeVisible();

      // Should have a "Go Home" link
      await expect(page.getByRole("link", { name: /go home/i })).toBeVisible();

      assertNoJsErrors(jsErrors);
    });

    test("T-ERR-02: 404 page Go Home link navigates to homepage", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks();
      await page.goto("/nonexistent-page-abc-123", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Click the Go Home link
      const goHomeLink = page.getByRole("link", { name: /go home/i });
      await expect(goHomeLink).toBeVisible();

      const href = await goHomeLink.getAttribute("href");
      expect(href).toBe("/");
    });

    test("T-ERR-03: deeply nested non-existent route shows 404", async ({ page, withApiMocks }) => {
      await withApiMocks();
      await page.goto("/some/deeply/nested/fake/route", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show the 404 heading
      await expect(page.getByRole("heading", { name: /404/i })).toBeVisible();
    });
  });

  test.describe("Community Not Found", () => {
    test("T-ERR-04: non-existent community shows community not-found page", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/nonexistent-community-abc": mockJson(null, 404),
      });

      await page.goto("/community/nonexistent-community-abc", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show either the community-specific not-found page or the global 404
      const hasCommunityNotFound = await Promise.race([
        // Community-specific: "Launch <slug> community!" heading
        page
          .getByRole("heading", { name: /launch.*community|community/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        // Or global 404
        page
          .getByRole("heading", { name: /404/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);

      expect(hasCommunityNotFound).toBeTruthy();
    });

    test("T-ERR-05: community not-found page has link to browse communities", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/missing-community-xyz": mockJson(null, 404),
      });

      await page.goto("/community/missing-community-xyz", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show a link to browse existing communities or go home
      const hasBrowseLink = await Promise.race([
        page
          .getByRole("link", { name: /browse.*communit|existing communit/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("link", { name: /go home/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);

      expect(hasBrowseLink).toBeTruthy();
    });
  });

  test.describe("Server Error Resilience", () => {
    test("T-ERR-06: page does not crash on API 500 errors", async ({ page, withApiMocks }) => {
      const jsErrors = collectJsErrors(page);

      const community = MOCK_COMMUNITIES.optimism;
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        // Simulate server errors on program fetching
        "**/v2/funding-program-configs/community/optimism**": (route) =>
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal Server Error" }),
          }),
      });

      await page.goto("/community/optimism", GOTO_OPTIONS);
      await waitForPageReady(page);

      // The page should still render (graceful degradation) rather than showing
      // a blank screen. It may show an error state, empty state, or partial content.
      await expect(page.locator("body")).toBeVisible();

      // The community name or some fallback content should be visible
      const hasContent = await Promise.race([
        page
          .getByText("Optimism")
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/error|try again|something went wrong/i)
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
      expect(hasContent).toBeTruthy();

      // Allow hydration warnings but no unhandled crashes
      assertNoJsErrors(jsErrors);
    });
  });
});
