import { createMockCommunity, MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockError, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * Cross-boundary integration tests: Auth + Wallet interactions.
 *
 * These tests verify the seam between the authentication layer (Privy)
 * and the wallet layer (Wagmi/EIP-1193) — a frequent source of race
 * conditions and sign-out loops in production.
 */
test.describe("Auth + Wallet Cross-Boundary", () => {
  test("T32-01: authenticated user with wallet sees connected state", async ({
    page,
    withApiMocks,
    loginAs,
    withWallet,
  }) => {
    const jsErrors = collectJsErrors(page);

    // Both auth and wallet are set up before navigation
    await loginAs("applicant");
    await withWallet();

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should render without sign-out loops or JS errors
    await expect(page.getByText("Optimism").first()).toBeVisible();
    const bodyText = await page.textContent("body");
    expect(bodyText?.toLowerCase()).not.toContain("sign in");

    assertNoJsErrors(jsErrors);
  });

  test("T32-02: wallet disconnection does not crash authenticated session", async ({
    page,
    withApiMocks,
    loginAs,
    withWallet,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");
    await withWallet();

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Simulate wallet disconnection by removing window.ethereum
    await page.evaluate(() => {
      Object.defineProperty(window, "ethereum", {
        value: undefined,
        writable: false,
        configurable: true,
      });
    });

    // Reload the page — should not crash
    await page.reload(GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should still render (possibly as guest, but not crash)
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(20);

    assertNoJsErrors(jsErrors);
  });

  test("T32-03: wallet address mismatch between auth and provider is handled", async ({
    page,
    withApiMocks,
    loginAs,
    withWallet,
  }) => {
    const jsErrors = collectJsErrors(page);

    // Auth says one address, wallet says another
    await loginAs("applicant"); // address: 0x9965...
    await withWallet({
      address: "0x1111111111111111111111111111111111111111",
    });

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The page should not crash — it may show a mismatch warning or
    // fall back to one of the addresses, but must remain functional
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(20);
    // No unhandled exceptions
    assertNoJsErrors(jsErrors);
  });

  test("T32-04: chain switch during authenticated session does not break UI", async ({
    page,
    withApiMocks,
    loginAs,
    withWallet,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");
    await withWallet({ chainId: "0xa" }); // Optimism

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Trigger a chain switch event from within the page
    await page.evaluate(() => {
      const ethereum = (window as Window & { ethereum?: { on?: Function } }).ethereum;
      if (ethereum && typeof ethereum.on === "function") {
        // The mock wallet's emit mechanism is internal, so we directly
        // call the wallet_switchEthereumChain to change chain
        (ethereum as { request: Function }).request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x1" }],
        });
      }
    });

    // Give the UI time to react to the chain change
    await page.waitForTimeout(500);

    // Page should remain functional after chain switch
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(20);
    assertNoJsErrors(jsErrors);
  });

  test("T32-05: unauthenticated user with wallet connected sees public content", async ({
    page,
    withApiMocks,
    withWallet,
  }) => {
    // Wallet is connected but no Privy auth session
    await withWallet();

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Should show public content as guest
    await expect(page.getByText("Optimism").first()).toBeVisible();

    // No admin-specific UI should appear
    const manageLink = page.getByRole("link", { name: /manage/i });
    await expect(manageLink).toHaveCount(0);
  });
});
