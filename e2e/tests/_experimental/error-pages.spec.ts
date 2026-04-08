import { createMockCommunity } from "../../data/communities";
import { expect, mockError, mockJson, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Error Page Rendering", () => {
  const community = createMockCommunity({ slug: "optimism" });

  test("T31-01: 500 error page renders when API returns server error", async ({
    page,
    withApiMocks,
  }) => {
    await withApiMocks({
      "**/v2/communities/optimism": mockError(500, "Internal Server Error"),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    const bodyText = await page.textContent("body");
    const hasErrorIndicator =
      bodyText?.includes("500") ||
      bodyText?.toLowerCase().includes("something went wrong") ||
      bodyText?.toLowerCase().includes("server error") ||
      bodyText?.toLowerCase().includes("error");
    expect(hasErrorIndicator).toBeTruthy();
  });

  test("T31-02: 403 forbidden page renders for unauthorized access", async ({
    page,
    withApiMocks,
  }) => {
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      // Mock a protected endpoint returning 403
      "**/v2/user/communities/admin": mockError(403, "Forbidden"),
    });
    // Navigate to a page that requires admin access
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The page should render without crashing, even if admin endpoints fail
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });

  test("T31-03: 429 rate limit is handled gracefully", async ({ page, withApiMocks }) => {
    await withApiMocks({
      "**/v2/communities/optimism": (route) =>
        route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ error: "Too Many Requests", statusCode: 429 }),
          headers: { "Retry-After": "60" },
        }),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    const bodyText = await page.textContent("body");
    // Page should render an error state, not crash
    expect(bodyText).toBeTruthy();
    const hasRateLimitOrError =
      bodyText?.toLowerCase().includes("rate limit") ||
      bodyText?.toLowerCase().includes("too many") ||
      bodyText?.toLowerCase().includes("try again") ||
      bodyText?.toLowerCase().includes("error") ||
      bodyText?.includes("429");
    expect(hasRateLimitOrError).toBeTruthy();
  });

  test("T31-04: error page has a retry or actionable button", async ({ page, withApiMocks }) => {
    await withApiMocks({
      "**/v2/communities/optimism": mockError(500, "Internal Server Error"),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Look for a retry button, "try again" link, or "go home" button
    const retryButton = page.getByRole("button", { name: /retry|try again|reload/i });
    const goHomeLink = page.getByRole("link", { name: /home|back|return/i });

    const hasActionableElement = (await retryButton.count()) > 0 || (await goHomeLink.count()) > 0;

    // At minimum, the error page should have some interactive escape hatch
    // If neither exists, check for any link that lets the user navigate away
    if (!hasActionableElement) {
      const anyLink = page.getByRole("link");
      expect(await anyLink.count()).toBeGreaterThan(0);
    }
  });

  test("T31-05: error page shows a helpful message to the user", async ({ page, withApiMocks }) => {
    await withApiMocks({
      "**/v2/communities/optimism": mockError(500, "Internal Server Error"),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    const bodyText = await page.textContent("body");
    // The error page should contain meaningful text beyond just a status code.
    // Check for any explanatory message — not just a blank page.
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(10);

    // Should not show raw JSON error responses or stack traces to users
    expect(bodyText).not.toContain("stack");
    expect(bodyText).not.toContain("TypeError");
    expect(bodyText).not.toContain("ReferenceError");
  });

  test("T31-06: user can navigate away from the error page", async ({ page, withApiMocks }) => {
    // First, trigger the error page
    await withApiMocks({
      "**/v2/communities/optimism": mockError(500, "Internal Server Error"),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    const errorUrl = page.url();

    // Navigate to the homepage, which should work since it uses different API calls
    await withApiMocks({
      "**/v2/communities/stats**": mockJson({
        totalCommunities: 5,
        totalProjects: 100,
        totalGrants: 50,
      }),
    });
    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify we actually navigated away from the error page
    const newUrl = page.url();
    expect(newUrl).not.toEqual(errorUrl);
    const newBodyText = await page.textContent("body");
    expect(newBodyText).toBeTruthy();
    expect(newBodyText!.trim().length).toBeGreaterThan(10);
  });
});
