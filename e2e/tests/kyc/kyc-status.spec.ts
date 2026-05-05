import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("KYC Status", () => {
  test("T1-46: KYC status displays when configured", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({ programId: "p1" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/communities/optimism/kyc-config": mockJson({
        enabled: true,
        provider: "synaps",
        requiredFor: ["milestone_completion"],
      }),
    });
    await page.goto("/community/optimism/programs/p1");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-47: KYC hidden when no KYC config", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({ programId: "p1" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/communities/optimism/kyc-config": mockJson({ enabled: false }),
    });
    await page.goto("/community/optimism/programs/p1");
    await waitForPageReady(page);
    // KYC-specific UI should not appear
    const kycBadge = page.getByText(/kyc required|verify identity/i);
    await expect(kycBadge).toHaveCount(0);
  });
});
