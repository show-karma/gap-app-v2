import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("RBAC Visibility", () => {
  const setupCommunity = async (
    withApiMocks: (
      overrides?: Record<string, (route: import("@playwright/test").Route) => Promise<void> | void>
    ) => Promise<void>
  ) => {
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([createMockProgram()]),
    });
  };

  test("T1-26: admin sees admin navigation items", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("communityAdmin");
    await setupCommunity(withApiMocks);
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // Admin-specific UI elements should be visible
    // Community admin should see manage/settings/admin links
    const adminIndicators = page.getByRole("link", { name: /manage|settings|admin|edit/i });
    const adminButtons = page.getByRole("button", { name: /manage|settings|admin|edit/i });
    const hasAdminUI = (await adminIndicators.count()) > 0 || (await adminButtons.count()) > 0;
    expect(hasAdminUI).toBeTruthy();
  });

  test("T1-27: guest does NOT see admin navigation", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("guest");
    await setupCommunity(withApiMocks);
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // Admin elements should not be visible to guests
    const manageLink = page.getByRole("link", { name: /manage/i });
    await expect(manageLink).toHaveCount(0);
  });

  test("T1-28: reviewer sees review-specific UI", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("reviewer");
    await setupCommunity(withApiMocks);
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // Reviewer should see the community page; admin-only manage links should not appear
    await expect(page.getByText("Optimism").first()).toBeVisible();
    const manageLink = page.getByRole("link", { name: /manage/i });
    await expect(manageLink).toHaveCount(0);
  });

  test("T1-29: super admin sees all sections", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("superAdmin");
    await setupCommunity(withApiMocks);
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // Super admin (wildcard permission) should see admin UI elements
    await expect(page.getByText("Optimism").first()).toBeVisible();
    const adminIndicators = page.getByRole("link", { name: /manage|settings|admin|edit/i });
    const adminButtons = page.getByRole("button", { name: /manage|settings|admin|edit/i });
    const hasAdminUI = (await adminIndicators.count()) > 0 || (await adminButtons.count()) > 0;
    expect(hasAdminUI).toBeTruthy();
  });

  test("T1-30: permission wildcard matching works", async ({ page, withApiMocks, loginAs }) => {
    // Super admin has "*" permission which should grant access to everything
    await loginAs("superAdmin");
    await setupCommunity(withApiMocks);
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    // The page should render fully without any permission-based blocks
    await expect(page.getByText("Optimism").first()).toBeVisible();
    // No "access denied" or "unauthorized" messages should appear
    const bodyText = await page.textContent("body");
    expect(bodyText?.toLowerCase()).not.toContain("access denied");
    expect(bodyText?.toLowerCase()).not.toContain("unauthorized");
  });
});
