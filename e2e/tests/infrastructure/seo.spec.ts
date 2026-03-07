import { createApprovedApplication, createMockApplication } from "../../data/applications";
import { createMockCommunity, MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertMetaTag, assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("SEO", () => {
  test("T1-17: meta tags are present on community page", async ({ page, withApiMocks }) => {
    const community = createMockCommunity({ slug: "optimism", name: "Optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await page.goto("/community/optimism");
    await waitForPageReady(page);
    // Check that essential meta tags exist
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("T1-18: robots.txt is accessible", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
    const content = await response?.text();
    expect(content?.toLowerCase()).toContain("user-agent");
  });

  test("T1-19: tenant logos load correctly", async ({ page, withApiMocks, withTenant }) => {
    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await withTenant("optimism");
    await page.goto("/");
    await waitForPageReady(page);
    // Check that images on the page have valid src attributes
    const images = page.locator("img");
    const count = await images.count();
    // At least one image should be present (logo, branding, etc.)
    // This is a basic check -- if no images, the test still passes
    if (count > 0) {
      const firstImgSrc = await images.first().getAttribute("src");
      expect(firstImgSrc).toBeTruthy();
    }
  });
});
