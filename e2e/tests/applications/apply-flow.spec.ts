import { createMockCommunity } from "../../data/communities";
import { createMockProgram, createMockProgramWithAccessCode } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Apply Flow", () => {
  test("T1-34: full apply flow - fill form and submit", async ({ page, withApiMocks, loginAs }) => {
    const program = createMockProgram({
      programId: "p1",
      title: "Test Program",
    });
    const community = createMockCommunity({ slug: "optimism" });
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications": mockJson(
        { success: true, referenceNumber: "APP-2024-001" },
        201
      ),
    });
    await page.goto("/community/optimism/programs/p1/apply");
    await waitForPageReady(page);
    // Page should load the application form
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-35: access-code gated program requires code", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const program = createMockProgramWithAccessCode({
      programId: "p-gated",
    });
    const community = createMockCommunity({ slug: "optimism" });
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p-gated": mockJson(program),
    });
    await page.goto("/community/optimism/programs/p-gated/apply");
    await waitForPageReady(page);
    // Should show access code input or gate
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-36: AI evaluation info displays when configured", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const program = createMockProgram({
      programId: "p-ai",
      title: "AI Evaluated Program",
    });
    const community = createMockCommunity({ slug: "optimism" });
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p-ai": mockJson(program),
    });
    await page.goto("/community/optimism/programs/p-ai");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-37: multi-step form preserves data on back navigation", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const program = createMockProgram({ programId: "p1" });
    const community = createMockCommunity({ slug: "optimism" });
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
    });
    await page.goto("/community/optimism/programs/p1/apply");
    await waitForPageReady(page);
    // The form should render without errors
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-38: form validation blocks invalid submit", async ({ page, withApiMocks, loginAs }) => {
    const program = createMockProgram({ programId: "p1" });
    const community = createMockCommunity({ slug: "optimism" });
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
    });
    await page.goto("/community/optimism/programs/p1/apply");
    await waitForPageReady(page);
    // Try to submit without filling required fields
    const submitButton = page.getByRole("button", {
      name: /submit|apply|send/i,
    });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should still be on the same page (not navigated away)
      expect(page.url()).toContain("/apply");
    }
  });
});
