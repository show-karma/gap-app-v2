import { MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Smoke Tests — Donation Pages", () => {
  const community = MOCK_COMMUNITIES.optimism;
  const programA = createMockProgram({
    programId: "program-donate-a",
    title: "Alpha Grants",
  });
  const programB = createMockProgram({
    programId: "program-donate-b",
    title: "Beta Grants",
  });

  test.describe("Program Selection Page", () => {
    test("T-DON-01: donation page loads and shows program selector when multiple programs exist", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([programA, programB]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show the program selection heading
      await expect(page.getByRole("heading", { name: /select a program/i })).toBeVisible();

      // The select dropdown should be present
      await expect(page.locator("select#program-select")).toBeVisible();
    });

    test("T-DON-02: donation page shows community name in header", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([programA, programB]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // The community name should appear in the header
      await expect(page.getByText("Optimism")).toBeVisible();

      // The support text should be visible
      await expect(page.getByText(/support projects/i)).toBeVisible();
    });

    test("T-DON-03: donation page shows program count", async ({ page, withApiMocks }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([programA, programB]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show "2 programs available"
      await expect(page.getByText(/2 programs available/i)).toBeVisible();
    });

    test("T-DON-04: donation page shows empty state when no programs exist", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should show a "no programs available" message
      await expect(page.getByRole("heading", { name: /no programs available/i })).toBeVisible();

      await expect(page.getByText(/no programs available for donations/i)).toBeVisible();
    });

    test("T-DON-05: donation page auto-redirects when only one program exists", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([programA]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // Should auto-redirect to the single program's donate page
      await page.waitForURL(/\/donate\/program-donate-a/, { timeout: 10000 });
      expect(page.url()).toContain("/donate/program-donate-a");
    });

    test("T-DON-06: donation page shows info card about donation flow", async ({
      page,
      withApiMocks,
    }) => {
      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
        "**/v2/funding-program-configs/community/optimism**": mockJson([programA, programB]),
      });

      await page.goto("/community/optimism/donate", GOTO_OPTIONS);
      await waitForPageReady(page);

      // The info card should explain the donation flow
      await expect(page.getByText(/after selecting a program/i)).toBeVisible();
    });
  });

  test.describe("Checkout Page", () => {
    test("T-DON-07: checkout page loads for unauthenticated user and shows empty cart", async ({
      page,
      withApiMocks,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
      });

      await page.goto("/community/optimism/donate/program-donate-a/checkout", GOTO_OPTIONS);
      await waitForPageReady(page);

      // The checkout page should load without JS errors
      assertNoJsErrors(jsErrors);

      // Should show either the checkout UI or an empty cart message
      const hasCheckoutContent = await Promise.race([
        page
          .getByText(/checkout|cart|donation/i)
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

    test("T-DON-08: checkout page does not produce server errors", async ({
      page,
      withApiMocks,
    }) => {
      const failedRequests: string[] = [];
      page.on("requestfailed", (req) => {
        if (req.url().includes("_next/static")) {
          failedRequests.push(req.url());
        }
      });

      await withApiMocks({
        "**/v2/communities/optimism": mockJson(community),
      });

      const response = await page.goto(
        "/community/optimism/donate/program-donate-a/checkout",
        GOTO_OPTIONS
      );
      await waitForPageReady(page);

      // Page should load without a 500 error
      expect(response?.status()).toBeDefined();
      expect(response!.status()).toBeLessThan(500);

      // No critical static assets should fail
      expect(failedRequests).toEqual([]);
    });
  });
});
