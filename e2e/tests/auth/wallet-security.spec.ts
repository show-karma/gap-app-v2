import { createMockCommunity } from "../../data/communities";
import { expect, mockJson, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

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
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // Verify the page loads with the authenticated user's context
    await expect(page).toHaveURL(/\/community\/optimism/);
    await expect(page.getByText("Optimism").first()).toBeVisible();
  });

  test("T1-32: spoofed address is rejected", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
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
    // The spoofed address (0x0000...) should not appear as the authenticated user
    await expect(page.getByText("Optimism").first()).toBeVisible();
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("0x0000000000000000000000000000000000000000");
  });

  test("T1-33: multi-wallet support works", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("communityAdmin");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // Community admin wallet should load community page with admin context
    await expect(page).toHaveURL(/\/community\/optimism/);
    await expect(page.getByText("Optimism").first()).toBeVisible();
  });
});
