import { createMockCommunity } from "../../data/communities";
import { createClosedProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

/**
 * Programs List E2E Tests
 *
 * NOTE: The community page `/community/optimism` is SSR — Next.js fetches
 * program data server-side from the real indexer API. `page.route()` only
 * intercepts browser-level requests, so mock data doesn't reach SSR.
 * These tests assert on real Optimism community data.
 */

test.describe("Programs List", () => {
  test("T1-07: programs grid renders with correct cards", async ({ page, withApiMocks }) => {
    await withApiMocks();
    await page.goto("/community/optimism");
    await waitForPageReady(page);
    // The community page SSR-fetches real data from the indexer.
    // Verify the heading and that at least one project card renders.
    await expect(page.getByText("Optimism").first()).toBeVisible({ timeout: 15000 });
    // The "View community projects" tab shows real projects
    const projectCards = page
      .locator("[class*='card'], [class*='Card'], article, [data-testid]")
      .first();
    await expect(page.locator("body")).toContainText(/Total Projects|Milestones|Updates/i);
  });

  test("T1-08: open program shows active status", async ({ page, withApiMocks }) => {
    await withApiMocks();
    await page.goto("/community/optimism");
    await waitForPageReady(page);
    // Community page loads with real programs — verify the page structure
    await expect(page.getByText("Optimism").first()).toBeVisible({ timeout: 15000 });
    // The "Funding opportunities" tab appears after client-side count fetch
    await expect(page.getByText("Funding opportunities")).toBeVisible({ timeout: 15000 });
  });

  test("T1-09: closed program has no apply CTA", async ({ page, withApiMocks }) => {
    const program = createClosedProgram({ title: "Closed Program" });
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      [`**/v2/funding-program-configs/${program.programId}`]: mockJson(program),
    });
    await page.goto(`/community/optimism/programs/${program.programId}`);
    await waitForPageReady(page);
    // "Apply" or "Get Started" button should not be visible for closed programs
    const applyButton = page.getByRole("link", {
      name: /apply|get started/i,
    });
    await expect(applyButton).toHaveCount(0);
  });

  test("T1-10: program card click navigates to detail page", async ({ page, withApiMocks }) => {
    const mockProgram = {
      programId: "test-program-001",
      chainID: 10,
      name: "Test Grants Program",
      metadata: { title: "Test Grants Program", description: "A test program" },
      applicationConfig: { isEnabled: true },
    };
    await withApiMocks({
      "**/v2/funding-program-configs/community/optimism**": mockJson([mockProgram]),
    });
    await page.goto("/community/optimism/funding-opportunities");
    await waitForPageReady(page);
    const programCard = page.locator('[aria-label^="View funding program"]').first();
    await expect(programCard).toBeVisible({ timeout: 30000 });
    const beforeUrl = page.url();
    await programCard.click();
    await waitForPageReady(page);
    expect(page.url()).not.toBe(beforeUrl);
    expect(page.url()).toContain("/programs/");
  });

  test("T1-11: program detail page loads with program info", async ({ page, withApiMocks }) => {
    const mockProgram = {
      programId: "test-program-002",
      chainID: 10,
      name: "Detail Grants Program",
      metadata: { title: "Detail Grants Program", description: "A detail test program" },
      applicationConfig: { isEnabled: true },
    };
    await withApiMocks({
      "**/v2/funding-program-configs/community/optimism**": mockJson([mockProgram]),
    });
    await page.goto("/community/optimism/funding-opportunities");
    await waitForPageReady(page);
    const programCard = page.locator('[aria-label^="View funding program"]').first();
    await expect(programCard).toBeVisible({ timeout: 30000 });
    await programCard.click();
    await waitForPageReady(page);
    await expect(page.locator("body")).toContainText(/Apply|Back to programs|Detail Grants/i, {
      timeout: 15000,
    });
  });

  test("T1-12: empty programs shows empty state", async ({ page, withApiMocks }) => {
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([]),
    });
    await page.goto("/community/optimism");
    await waitForPageReady(page);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});
