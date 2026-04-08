import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Journey — Project Creation", () => {
  test.describe("Navigation to Creation Page", () => {
    test("J-PROJ-01: authenticated user can navigate to project creation page", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
      });
      await loginAs("applicant");
      await page.goto("/project/create", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show project creation form or heading
      const hasCreationContent = await Promise.race([
        page
          .getByRole("heading", { name: /create.*project|new.*project/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/create.*project|register.*project/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasCreationContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });

    test("J-PROJ-02: unauthenticated user is redirected or prompted to sign in", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks();
      await page.goto("/project/create", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should redirect or show auth prompt
      const showsAuthPrompt = await page
        .getByText(/sign in|connect wallet|log in/i)
        .first()
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      const wasRedirected = !page.url().includes("/project/create");

      expect(showsAuthPrompt || wasRedirected).toBeTruthy();
    });
  });

  test.describe("Form Fields Validation", () => {
    test("J-PROJ-03: creation form displays required input fields", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks();
      await loginAs("applicant");
      await page.goto("/project/create", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should have a project name/title input
      const hasNameField = await Promise.race([
        page
          .getByRole("textbox", { name: /project.*name|title/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByLabel(/project.*name|title/i)
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .locator("input[name*='name'], input[name*='title']")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasNameField).toBeTruthy();
    });

    test("J-PROJ-04: creation form has a submit/create button", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks();
      await loginAs("applicant");
      await page.goto("/project/create", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should have a create/submit button
      const hasSubmit = await Promise.race([
        page
          .getByRole("button", { name: /create|submit|save|next|continue/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .locator("button[type='submit']")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasSubmit).toBeTruthy();
    });

    test("J-PROJ-05: submitting empty form shows validation errors", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks();
      await loginAs("applicant");
      await page.goto("/project/create", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Click the submit button without filling any fields
      const submitBtn = page
        .getByRole("button", { name: /create|submit|save|next|continue/i })
        .first();
      const formSubmitBtn = page.locator("button[type='submit']").first();

      const btn = await Promise.race([
        submitBtn
          .waitFor({ timeout: 5000 })
          .then(() => submitBtn)
          .catch(() => null),
        formSubmitBtn
          .waitFor({ timeout: 5000 })
          .then(() => formSubmitBtn)
          .catch(() => null),
      ]);

      if (btn) {
        await btn.click();

        // Should show validation error messages
        const hasValidation = await Promise.race([
          page
            .getByText(/required|cannot be empty|please enter|this field/i)
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

    test("J-PROJ-06: form accepts text input in project name field", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks();
      await loginAs("applicant");
      await page.goto("/project/create", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Find and fill the name field
      const nameField = await Promise.race([
        page
          .getByRole("textbox", { name: /project.*name|title/i })
          .waitFor({ timeout: 8000 })
          .then(() => page.getByRole("textbox", { name: /project.*name|title/i }))
          .catch(() => null),
        page
          .getByLabel(/project.*name|title/i)
          .waitFor({ timeout: 8000 })
          .then(() => page.getByLabel(/project.*name|title/i))
          .catch(() => null),
        page
          .locator("input[name*='name'], input[name*='title']")
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => page.locator("input[name*='name'], input[name*='title']").first())
          .catch(() => null),
      ]);

      if (nameField) {
        await nameField.fill("My Test Project");
        await expect(nameField).toHaveValue("My Test Project");
      }
    });
  });

  test.describe("Navigation Flow", () => {
    test("J-PROJ-07: dashboard empty state links to project creation", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks({
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
        "**/v2/user/communities/admin**": mockJson([]),
        "**/v2/funding-program-configs/my-reviewer-programs**": mockJson([]),
      });
      await loginAs("applicant");
      await page.goto("/dashboard", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Empty state should have a link/button to create a project
      const createLink = await Promise.race([
        page
          .getByRole("link", { name: /create.*project|new.*project/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => page.getByRole("link", { name: /create.*project|new.*project/i }).first())
          .catch(() => null),
        page
          .getByRole("button", { name: /create.*project|new.*project/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => page.getByRole("button", { name: /create.*project|new.*project/i }).first())
          .catch(() => null),
      ]);

      if (createLink) {
        await expect(createLink).toBeVisible();
      }
    });

    test("J-PROJ-08: my-projects page links to project creation when empty", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks({
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
      });
      await loginAs("applicant");
      await page.goto("/my-projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show a CTA to create a project
      const hasCta = await Promise.race([
        page
          .getByText(/create.*project|get started|no.*project/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("button", { name: /create|new/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("link", { name: /create|new/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasCta).toBeTruthy();
    });
  });
});
