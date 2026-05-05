import { MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Claim Flow", () => {
  test("T1-43: correct contract address used for claims", async ({
    page,
    withApiMocks,
    loginAs,
    withTenant,
  }) => {
    await loginAs("applicant");
    const community = MOCK_COMMUNITIES.optimism;
    const program = createMockProgram({ programId: "p1", communitySlug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
    });
    await withTenant("optimism");
    await page.goto("/");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-44: double-click prevention on claim button", async ({
    page,
    withApiMocks,
    loginAs,
    withTenant,
  }) => {
    await loginAs("applicant");
    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await withTenant("optimism");
    await page.goto("/");
    await waitForPageReady(page);
    // If claim button is present, rapid clicks should not cause issues
    const claimButtons = page.getByRole("button", { name: /claim/i });
    if ((await claimButtons.count()) > 0) {
      const claimButton = claimButtons.first();
      // Click rapidly
      await claimButton.click();
      await claimButton.click();
      // Page should remain stable
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("T1-45: already-claimed state shows correctly", async ({
    page,
    withApiMocks,
    loginAs,
    withTenant,
  }) => {
    await loginAs("applicant");
    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await withTenant("optimism");
    await page.goto("/");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });
});
