import { expect, mock404, test } from "../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../helpers/navigation";

/**
 * Codifies the manual reproduction performed for issue #1587: with the
 * advisor `GET /me` mocked to 404 (i.e. "not onboarded"), walk the full
 * onboarding wizard and assert that the active step is programmatically
 * determinable via the stepper's aria-current. This is the unambiguous
 * step-state signal the ad-hoc `<ol>` stepper was missing, which caused the
 * automated QA dogfood run to mis-detect step 2 vs step 3.
 */
test.describe("Donor research — onboarding wizard (#1587)", () => {
  /** Reads the label of the stepper item carrying aria-current="step". */
  const currentStepText = (page: import("@playwright/test").Page) =>
    page.locator('[aria-current="step"]').first();

  test("DR-ONB-01: walks welcome -> sample -> form with aria-current tracking the active step", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");
    await withApiMocks({
      // 404 -> the advisor hasn't onboarded yet, so the wizard renders.
      "**/v2/donor-research/me": mock404("advisor not onboarded"),
    });

    await page.goto("/donor-research/onboarding", GOTO_OPTIONS);
    await waitForPageReady(page);

    const progress = page.getByRole("navigation", { name: /onboarding progress/i });
    await expect(progress).toBeVisible();

    // Step 1.
    await expect(currentStepText(page)).toHaveText(/1\. Welcome/i);
    await page.getByRole("button", { name: /continue to sample report/i }).click();

    // Step 2 — the dogfood agent reported being "stuck" here; aria-current
    // makes the transition observable.
    await expect(currentStepText(page)).toHaveText(/2\. Sample report/i);
    await expect(page.getByRole("heading", { name: /what a report looks like/i })).toBeVisible();
    await page.getByRole("button", { name: /continue to setup/i }).click();

    // Step 3 — aria-current flips to "Get started", proving the Continue
    // click advanced the wizard.
    await expect(currentStepText(page)).toHaveText(/3\. Get started/i);
    await expect(page.getByRole("heading", { name: /get started/i })).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("DR-ONB-02: empty required field surfaces an announced validation error", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/donor-research/me": mock404("advisor not onboarded"),
    });

    await page.goto("/donor-research/onboarding", GOTO_OPTIONS);
    await waitForPageReady(page);

    await page.getByRole("button", { name: /continue to sample report/i }).click();
    await page.getByRole("button", { name: /continue to setup/i }).click();

    // Submit with the required Display name empty -> announced error, no advance.
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: /display name is required/i })
    ).toBeVisible();
    await expect(currentStepText(page)).toHaveText(/3\. Get started/i);
  });
});
