import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * PR #1618 — restrict signing & wallet identity to wallets linked to the
 * authenticated Privy user. These tests exercise the runtime-observable
 * consequences of the change in a real browser:
 *  - the auth providers (PrivyWagmiProviders reconcile effect + selectPrimaryWallet)
 *    don't break public rendering or loop,
 *  - a real Privy session resolves an identity and survives a reload without a
 *    sign-out loop (the exact CLAUDE.md auth gotcha this PR touches).
 *
 * The "foreign/stale MetaMask is excluded" invariant is not reproducible in
 * headless Chromium (Privy's useWallets() can't be made to surface an injected
 * window.ethereum inside an email session) and is covered by the unit/trust suites.
 */

const AUTH_ERROR_PATTERN = /signer|wallet|privy|wagmi|attestation|undefined.*address/i;

test.describe("PR1618 — public render stability (no login)", () => {
  test("P1: homepage renders hero + workflow, no auth-provider JS errors", async ({
    page,
    withApiMocks,
  }) => {
    const jsErrors = collectJsErrors(page);
    await withApiMocks({
      "**/v2/communities/stats**": mockJson({
        totalCommunities: 12,
        totalProjects: 340,
        totalGrants: 150,
      }),
    });

    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);

    await expect(
      page.getByRole("heading", { name: /funders fund and track/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /one platform for two motions/i }).first()
    ).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("P3: repeated reloads don't trigger an auth-provider error loop", async ({
    page,
    withApiMocks,
  }) => {
    const jsErrors = collectJsErrors(page);
    await withApiMocks();

    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);
    for (let i = 0; i < 3; i++) {
      await page.reload(GOTO_OPTIONS);
      await waitForPageReady(page);
    }

    await expect(page.locator("body")).toBeVisible();
    // The reconcile effect / selectPrimaryWallet must not spam auth errors on reload.
    const authErrors = jsErrors.filter((e) => AUTH_ERROR_PATTERN.test(e));
    expect(authErrors, `auth-related console errors:\n${authErrors.join("\n")}`).toEqual([]);
  });
});

test.describe("PR1618 — authenticated identity (real Privy login)", () => {
  test.skip(
    !process.env.QA_TEST_EMAIL,
    "requires QA_TEST_EMAIL/QA_TEST_OTP (real Privy session via setup project)"
  );

  test("A1+A2: identity resolves on an auth-gated page and persists across reload without sign-out", async ({
    page,
    withApiMocks,
  }) => {
    const jsErrors = collectJsErrors(page);
    await withApiMocks({
      "**/v2/user/projects**": mockJson({
        payload: [],
        pagination: { page: 1, limit: 10, total: 0 },
      }),
      "**/v2/user/communities/admin**": mockJson([]),
      "**/v2/funding-program-configs/my-reviewer-programs**": mockJson([]),
    });

    // Auth-gated page: if the session's identity failed to resolve (logged out /
    // withheld), the app redirects or shows a sign-in prompt instead.
    await page.goto("/dashboard", GOTO_OPTIONS);
    await waitForPageReady(page);

    // A1: identity resolved — stayed on /dashboard, Privy token present.
    expect(page.url(), "should not be bounced off /dashboard when authenticated").toContain(
      "/dashboard"
    );
    const tokenBefore = await page.evaluate(() => localStorage.getItem("privy:token"));
    expect(tokenBefore, "privy:token should be present after login").toBeTruthy();

    const signInVisibleBefore = await page
      .getByRole("button", { name: /^sign in$/i })
      .first()
      .isVisible()
      .catch(() => false);
    expect(signInVisibleBefore, "authenticated user should not see the primary Sign in CTA").toBe(
      false
    );

    // A2: reload — the active-wallet reconcile effect must NOT cause a sign-out loop.
    await page.reload(GOTO_OPTIONS);
    await waitForPageReady(page);
    // Give the Privy/Wagmi reconcile effect a moment to (mis)fire.
    await page.waitForTimeout(2500);

    expect(page.url(), "should remain authenticated on /dashboard after reload").toContain(
      "/dashboard"
    );
    const tokenAfter = await page.evaluate(() => localStorage.getItem("privy:token"));
    expect(tokenAfter, "privy:token should persist across reload (no sign-out loop)").toBeTruthy();

    const signInVisibleAfter = await page
      .getByRole("button", { name: /^sign in$/i })
      .first()
      .isVisible()
      .catch(() => false);
    expect(signInVisibleAfter, "should not revert to logged-out after reload").toBe(false);

    const authErrors = jsErrors.filter((e) => AUTH_ERROR_PATTERN.test(e));
    expect(authErrors, `auth-related console errors:\n${authErrors.join("\n")}`).toEqual([]);
  });
});
