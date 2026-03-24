import { createApprovedApplication } from "../../data/applications";
import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Application Success Page", () => {
  test("T1-20: public SSR success page loads", async ({ page, withApiMocks }) => {
    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({ programId: "p1", title: "Test Program" });
    const application = createApprovedApplication({
      referenceNumber: "APP-2024-001",
      programId: "p1",
    });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications/APP-2024-001": mockJson(application),
    });
    await page.goto("/community/optimism/programs/p1/applications/APP-2024-001/success");
    await waitForPageReady(page);
    // Verify success page loaded with confirmation content
    await expect(page).toHaveURL(/\/success/);
    const pageContent = await page.textContent("body");
    expect(
      pageContent?.toLowerCase().includes("success") ||
        pageContent?.toLowerCase().includes("submitted") ||
        pageContent?.toLowerCase().includes("approved") ||
        pageContent?.toLowerCase().includes("congratulations") ||
        pageContent?.includes("APP-2024-001")
    ).toBeTruthy();
  });
});
