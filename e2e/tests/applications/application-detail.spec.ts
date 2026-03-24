import { createMockApplication } from "../../data/applications";
import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Application Detail", () => {
  test("T1-15: SSR detail page loads", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({ programId: "p1" });
    const application = createMockApplication({ referenceNumber: "APP-2024-001", programId: "p1" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications/APP-2024-001": mockJson(application),
    });
    await page.goto("/community/optimism/programs/p1/applications/APP-2024-001");
    await waitForPageReady(page);
    // Verify the application detail page loaded with the correct application
    await expect(page).toHaveURL(/\/applications\/APP-2024-001/);
    await expect(page.getByText("APP-2024-001")).toBeVisible();
  });

  test("T1-16: 404 for invalid application", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({ programId: "p1" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications/INVALID-REF": mockJson({ error: "Not Found" }, 404),
    });
    await page.goto("/community/optimism/programs/p1/applications/INVALID-REF");
    await waitForPageReady(page);
    // Should show error or not found state
    const pageContent = await page.textContent("body");
    expect(
      pageContent?.toLowerCase().includes("not found") ||
        pageContent?.includes("404") ||
        pageContent?.toLowerCase().includes("error")
    ).toBeTruthy();
  });
});
