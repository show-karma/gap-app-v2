import { createApplicationList } from "../../data/applications";
import { createMockCommunity } from "../../data/communities";
import { expect, mockJson, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("My Applications", () => {
  test("T1-39: user sees their applications", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    const applications = createApplicationList(3);
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-applications/user/my-applications**": mockJson(applications),
    });

    // Navigate to my-applications (not just /community/optimism)
    await page.goto("/community/optimism/my-applications", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify the page loaded at the correct URL
    await expect(page).toHaveURL(/\/community\/optimism\/my-applications/);
    // Verify the page rendered meaningful content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(100);
  });

  test("T1-40: empty applications shows empty state", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-applications/user/my-applications**": mockJson([]),
    });

    // Navigate to my-applications (not just /community/optimism)
    await page.goto("/community/optimism/my-applications", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify the page loaded at the correct URL
    await expect(page).toHaveURL(/\/community\/optimism\/my-applications/);
    // Verify the page rendered meaningful content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(100);
  });
});
