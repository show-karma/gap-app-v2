import { MOCK_COMMUNITIES } from "../../data/communities";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Smoke Tests — Search & Discovery", () => {
  test("T-SRCH-01: funding map page loads", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto("/funding-map", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The funding map page should show a heading
    await expect(page.getByRole("heading").first()).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("T-SRCH-02: communities listing shows heading", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks({
      "**/v2/communities/stats**": mockJson({
        totalCommunities: 5,
        totalProjects: 100,
        totalGrants: 50,
      }),
    });
    await page.goto("/communities", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The communities page should display a heading or relevant content
    const [hasHeading, hasText] = await Promise.all([
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 10000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByText(/communit|ecosystem|explore/i)
        .first()
        .waitFor({ timeout: 10000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasHeading || hasText).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-SRCH-03: projects listing shows heading", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto("/projects", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The projects page should display a heading with "project" in it
    await expect(page.getByRole("heading", { name: /project/i }).first()).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("T-SRCH-04: community impact page loads", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(MOCK_COMMUNITIES.optimism),
    });
    await page.goto("/community/optimism/impact", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The impact page should render content with impact or community signals
    const [hasHeading, hasText] = await Promise.all([
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 10000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByText(/impact|community|optimism/i)
        .first()
        .waitFor({ timeout: 10000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasHeading || hasText).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });
});
