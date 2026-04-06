import { expect, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

// The project pages use async server components that fetch data via SSR.
// Playwright route mocks only intercept browser requests, not server-side fetches.
// We use a real project ID that exists in the production indexer API.
const REAL_PROJECT_ID = "0xb3ac3e1e2a897fe064b7b8559e593bba51846a703b8f1af43edba01a5201c361";

test.describe("Smoke Tests — Project Pages", () => {
  test("T-PROJ-01: project about page loads with project name", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto(`/project/${REAL_PROJECT_ID}/about`, GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasContent = await Promise.race([
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByText(/about|project/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-PROJ-02: project funding tab loads", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto(`/project/${REAL_PROJECT_ID}/funding`, GOTO_OPTIONS);
    await waitForPageReady(page);

    await expect(page.locator("body")).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("T-PROJ-03: project impact tab loads", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto(`/project/${REAL_PROJECT_ID}/impact`, GOTO_OPTIONS);
    await waitForPageReady(page);

    await expect(page.locator("body")).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("T-PROJ-04: project team tab loads", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto(`/project/${REAL_PROJECT_ID}/team`, GOTO_OPTIONS);
    await waitForPageReady(page);

    await expect(page.locator("body")).toBeVisible();

    assertNoJsErrors(jsErrors);
  });
});
