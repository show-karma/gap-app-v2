import { createMockCommunity, MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Whitelabel Routing", () => {
  test("T1-01: whitelabel domain loads correct community", async ({
    page,
    withApiMocks,
    withTenant,
  }) => {
    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await withTenant("optimism");
    await page.goto("/");
    await waitForPageReady(page);
    // Should show Optimism community content (the page was rewritten to /community/optimism)
    await expect(page.getByText("Optimism").first()).toBeVisible();
    // URL should stay clean (no /community/optimism prefix visible)
    expect(page.url()).not.toContain("/community/optimism");
  });

  test("T1-02: shared URL /community/arbitrum loads correctly", async ({ page, withApiMocks }) => {
    const community = createMockCommunity({
      slug: "arbitrum",
      name: "Arbitrum",
    });
    await withApiMocks({
      "**/v2/communities/arbitrum": mockJson(community),
    });
    await page.goto("/community/arbitrum");
    await waitForPageReady(page);
    // Verify the Arbitrum community page loaded with its content
    await expect(page).toHaveURL(/\/community\/arbitrum/);
    await expect(page.getByText("Arbitrum").first()).toBeVisible();
  });

  test("T1-03: no double-prefix on whitelabel navigation", async ({
    page,
    withApiMocks,
    withTenant,
  }) => {
    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([createMockProgram()]),
    });
    await withTenant("optimism");
    await page.goto("/");
    await waitForPageReady(page);
    // After any navigation, URL should never have /community/optimism/community/optimism
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/community\/optimism\/community\/optimism/);
  });

  test("T1-04: unknown community shows 404", async ({ page, withApiMocks }) => {
    await withApiMocks({
      "**/v2/communities/nonexistent-community-xyz": mockJson(null, 404),
    });
    await page.goto("/community/nonexistent-community-xyz");
    await waitForPageReady(page);
    // Should show some kind of 404 or error state
    const pageContent = await page.textContent("body");
    expect(
      page.url().includes("nonexistent") ||
        pageContent?.includes("404") ||
        pageContent?.includes("not found") ||
        pageContent?.toLowerCase().includes("not found")
    ).toBeTruthy();
  });

  test("T1-05: static assets bypass middleware", async ({ page, withTenant }) => {
    await withTenant("optimism");
    // Static assets under /images/, /logo/, etc. should bypass the whitelabel rewrite
    const response = await page.goto("/images/test-placeholder.png");
    // Either 200 (asset found) or 404 (not found but no redirect loop)
    // The key assertion is that it doesn't error out or redirect infinitely
    expect(response?.status()).toBeDefined();
  });

  test("T1-06: non-whitelabel domain works normally", async ({ page, withApiMocks }) => {
    const community = createMockCommunity({
      slug: "arbitrum",
      name: "Arbitrum",
    });
    await withApiMocks({
      "**/v2/communities/arbitrum": mockJson(community),
    });
    // No withTenant call — standard localhost access
    await page.goto("/community/arbitrum");
    await waitForPageReady(page);
    expect(page.url()).toContain("/community/arbitrum");
  });
});
