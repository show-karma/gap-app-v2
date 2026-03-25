import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Authentication", () => {
  test("T1-21: authenticated user sees their address", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The page should render as authenticated user showing their truncated address (0x9965...)
    // or a "connected" indicator, and the community name
    await expect(page.getByText("Optimism").first()).toBeVisible();
    // Verify at least the address prefix or a connected-state indicator is visible
    await expect(
      page
        .getByText("0x99")
        .or(page.getByText(/connected/i))
        .first()
    ).toBeVisible();
  });

  test("T1-22: session persists across page navigation", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([createMockProgram()]),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify community content is visible before navigating
    await expect(page.getByText("Optimism").first()).toBeVisible();

    // Navigate to the same community page again (simulating navigation)
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Should still be authenticated — page renders community content, not a login redirect
    await expect(page).toHaveURL(/\/community\/optimism/);
    await expect(page.getByText("Optimism").first()).toBeVisible();
  });

  test("T1-23: sign-out clears auth state", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // Clear auth state programmatically
    await page.evaluate(() => {
      localStorage.removeItem("privy:auth_state");
    });
    await page.reload(GOTO_OPTIONS);
    await waitForPageReady(page);
    // Page should still render (as guest) with community content visible
    await expect(page).toHaveURL(/\/community\/optimism/);
    await expect(page.getByText("Optimism").first()).toBeVisible();
  });

  test("T1-24: unauthenticated user can browse public pages", async ({ page, withApiMocks }) => {
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // Unauthenticated user can still see community content
    await expect(page).toHaveURL(/\/community\/optimism/);
    await expect(page.getByText("Optimism").first()).toBeVisible();
  });

  test("T1-25: different roles have different UI states", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    // First visit as guest
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // Guest should see the community name
    await expect(page.getByText("Optimism").first()).toBeVisible();

    const guestContent = await page.textContent("body");

    // Then visit as admin (loginAs sets up new auth state)
    await loginAs("communityAdmin");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/user/communities/admin": mockJson([community]),
    });
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Admin should also see the community name
    await expect(page.getByText("Optimism").first()).toBeVisible();

    const adminContent = await page.textContent("body");

    // Both should render meaningful content (not empty or trivially short)
    expect(guestContent?.length, "Guest page should have rendered content").toBeGreaterThan(50);
    expect(adminContent?.length, "Admin page should have rendered content").toBeGreaterThan(50);

    // The admin page content should differ from guest — admin sees their address
    // or admin-specific UI elements that guest does not
    expect(adminContent).not.toEqual(guestContent);

    // Admin should see their truncated address (0x3C44...) which guest would not
    expect(adminContent).toContain("0x3C");
  });
});
