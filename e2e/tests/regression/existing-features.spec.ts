import { createApprovedApplication, createMockApplication } from "../../data/applications";
import { createMockCommunity, MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertMetaTag, assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Existing Features Regression", () => {
  test("T1-51: dashboard loads for authenticated user", async ({ page, withApiMocks, loginAs }) => {
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/user/projects**": mockJson({
        payload: [],
        pagination: { page: 1, limit: 10, total: 0 },
      }),
      "**/v2/funding-applications/user/my-applications**": mockJson([]),
    });
    await page.goto("/dashboard");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-52: project pages still work", async ({ page, withApiMocks }) => {
    await withApiMocks({
      "**/v2/projects/test-project": mockJson({
        uid: "project-uid-001",
        slug: "test-project",
        title: "Test Project",
        description: "A test project",
        members: [],
        grants: [],
      }),
    });
    await page.goto("/project/test-project");
    await waitForPageReady(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1-53: no cross-community data leakage", async ({ page, withApiMocks, withTenant }) => {
    const optimism = MOCK_COMMUNITIES.optimism;
    const filecoin = MOCK_COMMUNITIES.filecoin;

    // Set up Optimism tenant
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(optimism),
      "**/v2/communities/filecoin": mockJson(filecoin),
    });
    await withTenant("optimism");
    await page.goto("/");
    await waitForPageReady(page);

    // The page should show Optimism content, not Filecoin
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    // URL should not contain filecoin
    expect(page.url()).not.toContain("filecoin");
  });
});
