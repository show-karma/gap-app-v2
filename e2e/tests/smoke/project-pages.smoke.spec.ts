import { expect, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

// SSR fetches bypass browser mocks, and smoke CI targets the staging app/indexer.
// Use a stable staging sitemap slug whose four tested tabs return 200.
const STAGING_PROJECT_SLUG = "buidlguidl";

test.describe("Smoke Tests — Project Pages", () => {
  test("T-PROJ-01: project about page loads with project name", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto(`/project/${STAGING_PROJECT_SLUG}/about`, GOTO_OPTIONS);
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
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-PROJ-02: project funding tab loads", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto(`/project/${STAGING_PROJECT_SLUG}/funding`, GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasTabContent = await Promise.race([
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByText(/funding|grant/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasTabContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-PROJ-03: project impact tab loads", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto(`/project/${STAGING_PROJECT_SLUG}/impact`, GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasTabContent = await Promise.race([
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByText(/impact/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasTabContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-PROJ-04: project team tab loads", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks();
    await page.goto(`/project/${STAGING_PROJECT_SLUG}/team`, GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasTabContent = await Promise.race([
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByText(/team|member/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasTabContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });
});
