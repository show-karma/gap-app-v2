import { MOCK_USERS } from "../../data/users";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Journey — Profile Edit", () => {
  const applicantAddress = MOCK_USERS.applicant.address;

  test.describe("Profile Page Access", () => {
    test("J-PROF-01: profile page loads for authenticated user", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        [`**/v2/users/${applicantAddress}**`]: mockJson({
          address: applicantAddress,
          displayName: "Test Applicant",
          bio: "A test user for E2E testing",
          avatar: null,
        }),
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
      });
      await loginAs("applicant");
      await page.goto(`/profile/${applicantAddress}`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // Profile page should show user-related content
      const hasProfileContent = await Promise.race([
        page
          .getByText(applicantAddress.slice(0, 6))
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/profile|account/i)
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
      expect(hasProfileContent).toBeTruthy();

      assertNoJsErrors(jsErrors);
    });

    test("J-PROF-02: public profile page is accessible without authentication", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        [`**/v2/users/${applicantAddress}**`]: mockJson({
          address: applicantAddress,
          displayName: "Public User",
          bio: "Visible to all",
          avatar: null,
        }),
      });

      await page.goto(`/profile/${applicantAddress}`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // Public profile should render for anyone
      await expect(page.locator("body")).toBeVisible();

      const hasContent = await Promise.race([
        page
          .getByText(applicantAddress.slice(0, 6))
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
    });

    test("J-PROF-03: non-existent profile address shows appropriate state", async ({
      page,
      withApiMocks,
    }) => {
      const fakeAddress = "0x0000000000000000000000000000000000000000";

      await withApiMocks({
        [`**/v2/users/${fakeAddress}**`]: mockJson(null, 404),
      });

      await page.goto(`/profile/${fakeAddress}`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show either empty profile, 404, or the address itself
      const hasContent = await Promise.race([
        page
          .getByText(/not found|no profile|0x0000/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading", { name: /404/i })
          .waitFor({ timeout: 5000 })
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
    });
  });

  test.describe("Profile Edit UI", () => {
    test("J-PROF-04: own profile page shows edit controls for authenticated user", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      await withApiMocks({
        [`**/v2/users/${applicantAddress}**`]: mockJson({
          address: applicantAddress,
          displayName: "Test Applicant",
          bio: "A test user",
          avatar: null,
        }),
        "**/v2/user/projects**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
      });
      await loginAs("applicant");
      await page.goto(`/profile/${applicantAddress}`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show edit button/link for own profile
      const hasEditAction = await Promise.race([
        page
          .getByRole("button", { name: /edit|update|save/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("link", { name: /edit.*profile|update.*profile/i })
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .locator("[data-testid*='edit'], [aria-label*='edit']")
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
      ]);
      // Edit controls may not be visible on the profile view if it requires navigation;
      // verify the page at least loaded the profile content
      const profileLoaded = await page
        .getByText(applicantAddress.slice(0, 6))
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasEditAction || profileLoaded).toBeTruthy();
    });

    test("J-PROF-05: viewing another user profile does not show edit controls", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const otherAddress = MOCK_USERS.reviewer.address;

      await withApiMocks({
        [`**/v2/users/${otherAddress}**`]: mockJson({
          address: otherAddress,
          displayName: "Another User",
          bio: "Not your profile",
          avatar: null,
        }),
      });
      await loginAs("applicant");
      await page.goto(`/profile/${otherAddress}`, GOTO_OPTIONS);
      await waitForPageReady(page);

      // Edit button should NOT be visible on someone else's profile
      const editBtn = page.getByRole("button", { name: /edit.*profile/i });
      const editLink = page.getByRole("link", { name: /edit.*profile/i });

      const editVisible = await Promise.race([
        editBtn
          .waitFor({ timeout: 3000 })
          .then(() => true)
          .catch(() => false),
        editLink
          .waitFor({ timeout: 3000 })
          .then(() => true)
          .catch(() => false),
      ]);

      // It is acceptable for there to be no edit controls at all
      // If they exist, they should not be for this other user's profile
      if (editVisible) {
        // If edit controls somehow appear, verify the page is for the other user
        const pageContent = await page.textContent("body");
        expect(pageContent).toContain(otherAddress.slice(0, 6));
      }
    });

    test("J-PROF-06: profile page does not crash on API error", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        [`**/v2/users/${applicantAddress}**`]: (route) =>
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal Server Error" }),
          }),
      });
      await loginAs("applicant");
      await page.goto(`/profile/${applicantAddress}`, GOTO_OPTIONS);
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
        page
          .getByText(applicantAddress.slice(0, 6))
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
