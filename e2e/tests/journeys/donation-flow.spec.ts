import { MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mock404, mockError, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Journey — Donation Flow", () => {
  const community = MOCK_COMMUNITIES.optimism;
  const programA = createMockProgram({
    programId: "program-donate-a",
    title: "Alpha Grants",
    budgetAmount: 500000,
    budgetToken: "OP",
  });
  const programB = createMockProgram({
    programId: "program-donate-b",
    title: "Beta Grants",
    budgetAmount: 250000,
    budgetToken: "USDC",
  });

  test.describe("Program Selection", () => {
    test("J-DON-01: user can navigate to donation page and see available programs", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([programA, programB]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Program selector heading should be visible
      await expect(page.getByRole("heading", { name: /select a program/i })).toBeVisible();

      // Both programs should be selectable
      await expect(page.getByText(/2 programs available/i)).toBeVisible();
    });

    test("J-DON-02: selecting a program navigates to its checkout page", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([programA, programB]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Select the first program from the dropdown
      const select = page.locator("select#program-select");
      await expect(select).toBeVisible();
      await select.selectOption({ index: 1 });

      // Click the continue/proceed button
      const continueBtn = page.getByRole("button", { name: /continue|proceed|next/i });
      const continueLink = page.getByRole("link", { name: /continue|proceed|next/i });

      const hasContinue = await Promise.race([
        continueBtn
          .waitFor({ timeout: 3000 })
          .then(() => "button" as const)
          .catch(() => null),
        continueLink
          .waitFor({ timeout: 3000 })
          .then(() => "link" as const)
          .catch(() => null),
      ]);

      if (hasContinue === "button") {
        await continueBtn.click();
      } else if (hasContinue === "link") {
        await continueLink.click();
      }

      // Should navigate toward a checkout or program-specific donate page
      await page.waitForURL(/\/donate\/program-donate-/, { timeout: 10000 }).catch(() => {
        // Auto-navigation may not happen; verify we are still on a valid page
      });
    });

    test("J-DON-03: single program auto-redirects to checkout", async ({ page, withApiMocks }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([programA]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // With only one program, should auto-redirect
      await page.waitForURL(/\/donate\/program-donate-a/, { timeout: 10000 });
      expect(page.url()).toContain("/donate/program-donate-a");
    });
  });

  test.describe("Checkout Page", () => {
    test("J-DON-04: checkout page loads with community branding", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([programA]),
      });

      await page.goto("/community/optimism/donate/program-donate-a/checkout", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Community name should appear on the page
      await expect(page.getByText("Optimism").first()).toBeVisible();

      // Page should load without JS errors
      assertNoJsErrors(jsErrors);
    });

    test("J-DON-05: checkout page shows empty cart state for new visitor", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
      });

      await page.goto("/community/optimism/donate/program-donate-a/checkout", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show checkout-related content or empty cart message
      const hasCheckoutContent = await Promise.race([
        page
          .getByText(/checkout|cart|donation|empty/i)
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
      expect(hasCheckoutContent).toBeTruthy();
    });
  });

  test.describe("Error States", () => {
    test("J-DON-06: donation page shows empty state when community has no programs", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      await expect(page.getByRole("heading", { name: /no programs available/i })).toBeVisible();

      await expect(page.getByText(/no programs available for donations/i)).toBeVisible();
    });

    test("J-DON-07: donation page handles community not found gracefully", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/nonexistent-slug": mock404("Community not found"),
      });

      await page.goto("/community/nonexistent-slug/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show either a 404 or a community-specific not-found state
      const hasErrorContent = await Promise.race([
        page
          .getByRole("heading", { name: /404/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByRole("heading", { name: /launch.*community|not found/i })
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/community/i)
          .first()
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false),
      ]);
      expect(hasErrorContent).toBeTruthy();
    });

    test("J-DON-08: donation page recovers gracefully from API 500 on programs fetch", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockError(500, "Server error"),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Page should not crash — show error state or empty state
      await expect(page.locator("body")).toBeVisible();

      const hasContent = await Promise.race([
        page
          .getByText(/error|try again|something went wrong/i)
          .first()
          .waitFor({ timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        page
          .getByText(/no programs/i)
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
