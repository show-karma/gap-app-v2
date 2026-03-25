import { createApprovedApplication } from "../../data/applications";
import { MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockError, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * Cross-boundary integration tests: Wallet + API interactions.
 *
 * These tests verify the seam between the wallet layer (EIP-1193 provider)
 * and the indexer API. They cover scenarios where on-chain state and API
 * responses must be consistent: claim eligibility, balance checks, and
 * RPC failures during API-driven flows.
 */
test.describe("Wallet + API Cross-Boundary", () => {
  test("T32-11: RPC timeout during page load shows error state, not hang", async ({
    page,
    withApiMocks,
    loginAs,
    withWallet,
    withRpcFailure,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");
    await withWallet();
    // Inject RPC timeout for eth_getBalance requests
    await withRpcFailure({
      mode: "timeout",
      methods: ["eth_getBalance"],
    });

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should still render community content even if balance fetch fails
    await expect(page.getByText("Optimism").first()).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("T32-12: rate-limited RPC does not break claim UI rendering", async ({
    page,
    withApiMocks,
    loginAs,
    withWallet,
    withRpcFailure,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");
    await withWallet();
    await withRpcFailure({ mode: "rate-limit" });

    const community = MOCK_COMMUNITIES.optimism;
    const program = createMockProgram({ programId: "p1" });
    const application = createApprovedApplication({ programId: "p1" });

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications/program/p1**": mockJson([application]),
    });

    await page.goto("/community/optimism/programs/p1", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should render program content despite RPC rate limiting
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(20);

    assertNoJsErrors(jsErrors);
  });

  test("T32-13: malformed RPC response does not cause unhandled exception", async ({
    page,
    withApiMocks,
    loginAs,
    withWallet,
    withRpcFailure,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");
    await withWallet();
    await withRpcFailure({ mode: "malformed-json" });

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The page should handle JSON parse errors gracefully
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T32-14: API returns claim data but wallet has zero balance", async ({
    page,
    withApiMocks,
    loginAs,
    withWallet,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");
    // Wallet with zero balance
    await withWallet({ balance: "0x0" });

    const community = MOCK_COMMUNITIES.optimism;
    const program = createMockProgram({ programId: "p1" });
    const application = createApprovedApplication({ programId: "p1" });

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications/program/p1**": mockJson([application]),
    });

    await page.goto("/community/optimism/programs/p1", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should render even with zero balance — the claim button may
    // be disabled or show an insufficient funds warning, but must not crash
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(20);

    assertNoJsErrors(jsErrors);
  });

  test("T32-15: server error on API + RPC failure = graceful error page", async ({
    page,
    withApiMocks,
    withWallet,
    withRpcFailure,
  }) => {
    const jsErrors = collectJsErrors(page);

    await withWallet();
    // Both API and RPC fail simultaneously
    await withRpcFailure({ mode: "server-error" });
    await withApiMocks({
      "**/v2/communities/optimism": mockError(500, "Internal Server Error"),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should show an error state, not a blank screen or raw stack trace
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
    expect(bodyText).not.toContain("TypeError");
    expect(bodyText).not.toContain("ReferenceError");

    assertNoJsErrors(jsErrors);
  });
});
