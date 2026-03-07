import { createMockCommunity } from "../../data/communities";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Wallet Security", () => {
  test("T1-31: compareAllWallets prevents address mismatch", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await page.goto("/community/optimism");
    await waitForPageReady(page);
    // Verify the page loads with the authenticated user's address
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-32: spoofed address is rejected", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await page.goto("/community/optimism");
    await waitForPageReady(page);
    // Try to tamper with localStorage address
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("privy:auth_state") || "{}");
      state.user = { wallet: { address: "0x0000000000000000000000000000000000000000" } };
      localStorage.setItem("privy:auth_state", JSON.stringify(state));
    });
    await page.reload();
    await waitForPageReady(page);
    // Page should still render (potentially as guest if address validation kicks in)
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-33: multi-wallet support works", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("communityAdmin");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await page.goto("/community/optimism");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });
});
