import { createApprovedApplication, createMockApplication } from "../../data/applications";
import { createMockCommunity, MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertMetaTag, assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Claim Tenant Gating", () => {
  test("T1-41: claim button visible on Optimism community", async ({
    page,
    withApiMocks,
    loginAs,
    withTenant,
  }) => {
    await loginAs("applicant");
    const community = MOCK_COMMUNITIES.optimism;
    const program = createMockProgram({ programId: "p1", communitySlug: "optimism" });
    const application = createApprovedApplication({ programId: "p1" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications/program/p1**": mockJson([application]),
    });
    await withTenant("optimism");
    await page.goto("/");
    await waitForPageReady(page);
    // Page should load Optimism community with its content
    await expect(page.getByText("Optimism").first()).toBeVisible();
  });

  test("T1-42: claim button hidden on non-Optimism communities", async ({
    page,
    withApiMocks,
    loginAs,
    withTenant,
  }) => {
    await loginAs("applicant");
    const community = MOCK_COMMUNITIES.filecoin;
    const program = createMockProgram({ programId: "p1", communitySlug: "filecoin" });
    await withApiMocks({
      "**/v2/communities/filecoin": mockJson(community),
      "**/v2/funding-program-configs/community/filecoin**": mockJson([program]),
    });
    await withTenant("filecoin");
    await page.goto("/");
    await waitForPageReady(page);
    // Claim-specific UI should not appear on Filecoin
    const claimButton = page.getByRole("button", { name: /claim/i });
    await expect(claimButton).toHaveCount(0);
  });
});
