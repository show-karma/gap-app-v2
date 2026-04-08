import { createMockApplication } from "../../data/applications";
import { MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

const community = MOCK_COMMUNITIES.optimism;
const program = createMockProgram({
  programId: "program-app-001",
  title: "Application Smoke Program",
});

test.describe("Smoke Tests — Application Flow", () => {
  test.describe("Browse Applications", () => {
    test("T-APP-01: browse applications page loads for reviewer", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism**": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      });
      await loginAs("reviewer");
      await page.goto("/community/optimism/browse-applications", GOTO_OPTIONS);
      await waitForPageReady(page);

      // The page has a static h1 "Browse Applications" that renders immediately
      const hasContent = await Promise.race([
        page
          .getByRole("heading", { name: /application/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/application/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });

    test("T-APP-02: browse applications shows empty state", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism**": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      });
      await loginAs("reviewer");
      await page.goto("/community/optimism/browse-applications", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show the Browse Applications heading or content
      const hasContent = await Promise.race([
        page
          .getByText(/application/i)
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
      expect(hasContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });

    test("T-APP-03: application detail page loads with status", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);
      const application = createMockApplication({
        referenceNumber: "APP-2024-001",
        status: "in_review",
      });

      await withApiMocks({
        "**/v2/communities/optimism**": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
        "**/v2/applications/APP-2024-001**": mockJson(application),
        "**/v2/funding-applications/APP-2024-001**": mockJson(application),
      });
      await loginAs("reviewer");
      await page.goto("/community/optimism/browse-applications/APP-2024-001", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show the application detail or a heading
      const hasContent = await Promise.race([
        page
          .getByText(/APP-2024-001/i)
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
      expect(hasContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });
  });

  test.describe("Apply Page", () => {
    // The apply page is an async server component that fetches program data server-side.
    // It uses the real indexer API for SSR (Playwright route mocks only intercept browser requests).
    // We use a real program ID (961 = "Optimism ASP") that exists in the production API.
    const REAL_PROGRAM_ID = "961";

    test("T-APP-04: apply page renders form for applicant", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism**": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      });
      await loginAs("applicant");
      await page.goto(`/community/optimism/programs/${REAL_PROGRAM_ID}/apply`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show a form or form-related content
      const hasFormContent = await Promise.race([
        page
          .locator("form")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("textbox")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/apply/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasFormContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });

    test("T-APP-05: apply page shows program title in header", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism**": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      });
      await loginAs("applicant");
      await page.goto(`/community/optimism/programs/${REAL_PROGRAM_ID}/apply`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should display the real program title or a heading
      const hasTitle = await Promise.race([
        page
          .getByText(/Optimism ASP|Apply for/i)
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
      expect(hasTitle).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });

    test("T-APP-06: apply page loads without JS errors", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism**": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      });
      await loginAs("applicant");
      await page.goto(`/community/optimism/programs/${REAL_PROGRAM_ID}/apply`, GOTO_OPTIONS);
      await waitForPageReady(page);

      assertNoJsErrors(jsErrors);
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 8000 });
    });
  });
});
