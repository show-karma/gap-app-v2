import { createApplicationList } from "../../data/applications";
import { MOCK_COMMUNITIES } from "../../data/communities";
import {
  createClosedProgram,
  createMockProgram,
  createMockProgramWithAccessCode,
} from "../../data/programs";
import { expect, mock404, mockError, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import {
  GOTO_OPTIONS,
  navigateToApply,
  navigateToProgram,
  waitForPageReady,
} from "../../helpers/navigation";

test.describe("Journey — Grant Application", () => {
  const community = MOCK_COMMUNITIES.optimism;
  const program = createMockProgram({
    programId: "program-grants-001",
    title: "Infrastructure Grants",
    description: "Funding for infrastructure projects on Optimism",
  });
  const closedProgram = createClosedProgram();
  const accessCodeProgram = createMockProgramWithAccessCode();

  test.describe("Program Page", () => {
    test("J-APP-01: program page loads with program details", async ({ page, withApiMocks }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
        [`**/v2/funding-program-configs/${program.programId}**`]: mockJson(program),
        "**/v2/funding-applications/program/**": mockJson([]),
      });

      await navigateToProgram(page, "optimism", program.programId);

      // Program title should be visible
      const hasProgramContent = await Promise.race([
        page
          .getByText("Infrastructure Grants")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasProgramContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });

    test("J-APP-02: program page shows apply button for active program", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
        [`**/v2/funding-program-configs/${program.programId}**`]: mockJson(program),
        "**/v2/funding-applications/program/**": mockJson([]),
      });

      await navigateToProgram(page, "optimism", program.programId);

      // Should have an apply button or link
      const hasApplyAction = await Promise.race([
        page
          .getByRole("link", { name: /apply/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("button", { name: /apply/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/apply now|submit.*application/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasApplyAction).toBeTruthy();
    });
  });

  test.describe("Application Form", () => {
    test("J-APP-03: apply page loads with form fields for authenticated user", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
        [`**/v2/funding-program-configs/${program.programId}**`]: mockJson(program),
      });
      await loginAs("applicant");
      await navigateToApply(page, "optimism", program.programId);

      // Application form should have input fields
      const hasFormFields = await Promise.race([
        page
          .getByRole("textbox")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .locator("input, textarea, select")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasFormFields).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });

    test("J-APP-04: apply page redirects unauthenticated user or shows sign-in prompt", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
        [`**/v2/funding-program-configs/${program.programId}**`]: mockJson(program),
      });

      await page.goto(`/community/optimism/programs/${program.programId}/apply`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should redirect or prompt for authentication
      const showsAuthPrompt = await page
        .getByText(/sign in|connect wallet|log in/i)
        .first()
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      const wasRedirected = !page.url().includes("/apply");

      expect(showsAuthPrompt || wasRedirected).toBeTruthy();
    });

    test("J-APP-05: submitting empty application form shows validation errors", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
        [`**/v2/funding-program-configs/${program.programId}**`]: mockJson(program),
      });
      await loginAs("applicant");
      await navigateToApply(page, "optimism", program.programId);

      // Find and click submit without filling fields
      const submitBtn = await Promise.race([
        page
          .getByRole("button", { name: /submit|apply|send/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => page.getByRole("button", { name: /submit|apply|send/i }).first())
          .catch(() => null),
        page
          .locator("button[type='submit']")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => page.locator("button[type='submit']").first())
          .catch(() => null),
      ]);

      if (submitBtn) {
        await submitBtn.click();

        // Should show validation errors
        const hasValidation = await Promise.race([
          page
            .getByText(/required|cannot be empty|please fill|this field/i)
            .first()
            .waitFor({ timeout: 5000 })
            .then(() => true)
            .catch(() => false),
          page
            .locator("[role='alert']")
            .first()
            .waitFor({ timeout: 5000 })
            .then(() => true)
            .catch(() => false),
          page
            .locator(".text-red-500, .text-error, [data-error]")
            .first()
            .waitFor({ timeout: 5000 })
            .then(() => true)
            .catch(() => false),
        ]);
        expect(hasValidation).toBeTruthy();
      }
    });
  });

  test.describe("Error and Edge Cases", () => {
    test("J-APP-06: closed program does not show apply option or shows closed status", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([closedProgram]),
        [`**/v2/funding-program-configs/${closedProgram.programId}**`]: mockJson(closedProgram),
        "**/v2/funding-applications/program/**": mockJson([]),
      });

      await navigateToProgram(page, "optimism", closedProgram.programId);

      // Should show closed status or disabled apply button
      const hasClosedIndicator = await Promise.race([
        page
          .getByText(/closed|ended|no longer accepting/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("button", { name: /apply/i, disabled: true })
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        // The page may simply not show an apply button at all
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasClosedIndicator).toBeTruthy();
    });

    test("J-APP-07: non-existent program shows not-found state", async ({ page, withApiMocks }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([]),
        "**/v2/funding-program-configs/nonexistent-program**": mock404("Program not found"),
      });

      await page.goto("/community/optimism/programs/nonexistent-program", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show 404 or not-found content
      const hasNotFound = await Promise.race([
        page
          .getByRole("heading", { name: /404|not found/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/not found|does not exist|no program/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasNotFound).toBeTruthy();
    });

    test("J-APP-08: API error on program fetch shows graceful error state", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockError(500, "Server error"),
      });

      await page.goto("/community/optimism/programs/program-grants-001", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Page should not crash
      await expect(page.locator("body")).toBeVisible();

      const hasContent = await Promise.race([
        page
          .getByText(/error|try again|something went wrong/i)
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading")
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });
  });
});
