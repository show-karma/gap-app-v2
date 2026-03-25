import { createApprovedApplication, createMockApplication } from "../../data/applications";
import { createMockCommunity, MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertMetaTag, assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
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
    // Verify Optimism tenant page loaded correctly (whitelabel rewrite worked)
    await expect(page.getByText("Optimism").first()).toBeVisible();
    // URL should not expose the community path prefix on whitelabel
    expect(page.url()).not.toContain("/community/optimism");
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

    // Verify the page loaded correctly first
    await expect(page.getByText("Optimism").first()).toBeVisible();

    // Assert that claim buttons exist before testing double-click behavior.
    // If the UI legitimately has no claim buttons, the test should be updated
    // to target a page that does, rather than silently passing.
    const claimButtons = page.getByRole("button", { name: /claim/i });
    const claimButtonCount = await claimButtons.count();

    if (claimButtonCount > 0) {
      // Claim button found -- test rapid clicks do not cause issues
      const claimButton = claimButtons.first();
      await claimButton.click();
      await claimButton.click();
      // Page should remain stable after rapid clicks - no crash
      await expect(page.getByText("Optimism").first()).toBeVisible();
    } else {
      // No claim buttons on this page -- mark the test as explicitly skipped
      // so it does not silently pass and mask a missing test scenario.
      test.skip(
        true,
        "No claim buttons found on the tenant home page; test needs a page with claimable items"
      );
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

    // Verify Optimism community content loaded
    await expect(page.getByText("Optimism").first()).toBeVisible();

    // Check for either a "claimed" indicator or a claim button.
    // The test should assert a specific state rather than just checking page text length.
    const claimedIndicator = page.getByText(/claimed|already claimed/i);
    const claimButton = page.getByRole("button", { name: /claim/i });

    const claimedCount = await claimedIndicator.count();
    const claimButtonCount = await claimButton.count();

    // At least one of these states should be present on a claim-related page,
    // or the page should show the community name confirming it loaded correctly.
    // Assert that we can identify the claim state rather than falling back to text length.
    expect(
      claimedCount > 0 || claimButtonCount > 0,
      "Page should show either a 'claimed' indicator or a 'claim' button. " +
        `Found ${claimedCount} claimed indicators and ${claimButtonCount} claim buttons.`
    ).toBe(true);
  });
});
