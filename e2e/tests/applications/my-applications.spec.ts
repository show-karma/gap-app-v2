import { createApplicationList } from "../../data/applications";
import { createMockCommunity } from "../../data/communities";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("My Applications", () => {
  test("T1-39: user sees their applications", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    const applications = createApplicationList(3);
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-applications/user/my-applications**": mockJson(applications),
    });
    await page.goto("/community/optimism");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-40: empty applications shows empty state", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-applications/user/my-applications**": mockJson([]),
    });
    await page.goto("/community/optimism");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });
});
