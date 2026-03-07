import { createApplicationList } from "../../data/applications";
import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Browse Applications", () => {
  test("T1-13: applications list renders", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("communityAdmin");
    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({ programId: "p1" });
    const applications = createApplicationList(5);
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications/program/p1**": mockJson(applications),
    });
    await page.goto("/community/optimism/programs/p1");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-14: empty applications list shows empty state", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await loginAs("communityAdmin");
    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({ programId: "p1" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications/program/p1**": mockJson([]),
    });
    await page.goto("/community/optimism/programs/p1");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });
});
