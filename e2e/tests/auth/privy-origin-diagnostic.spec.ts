/**
 * Browser-automation coverage for the preview-only PrivyOriginDiagnostic
 * (components/Utilities/PrivyOriginDiagnostic.tsx), the in-repo guardrail from
 * PR #1619 / issue #1193.
 *
 * Why a dedicated spec (and why it is gated):
 *  - The diagnostic only renders when `envVars.VERCEL_ENV === "preview"` and only
 *    arms after a REAL login attempt while unauthenticated. The default e2e webServer
 *    runs with NEXT_PUBLIC_E2E_AUTH_BYPASS=true (auth short-circuited) and without a
 *    preview env, so the component never mounts/arms there. Running this in the normal
 *    suite would therefore false-fail.
 *  - The unit/integration suites already exercise the React logic against a *mocked*
 *    PerformanceObserver. The thing only a real browser can prove is the detection
 *    contract itself: that a genuine cross-origin auth.privy.io 403 surfaces
 *    `PerformanceResourceTiming.responseStatus === 403` to a live PerformanceObserver,
 *    and that the real component trips on it (and ONLY on it). That is what this spec
 *    validates.
 *
 * How to run (server must expose the preview env and the REAL Privy flow):
 *   1. Start a dev server WITHOUT the auth bypass and WITH the preview env:
 *        NEXT_PUBLIC_VERCEL_ENV=preview pnpm run dev
 *   2. PRIVY_DIAG_E2E=1 pnpm exec playwright test \
 *        --config e2e/playwright.config.ts e2e/tests/auth/privy-origin-diagnostic.spec.ts
 *
 * Without PRIVY_DIAG_E2E=1 the whole file skips, keeping the default CI suite green.
 *
 * `ignoreHTTPSErrors` / `--ignore-certificate-errors` let the headless browser reach
 * the real auth.privy.io behind a TLS-intercepting sandbox proxy; they are harmless
 * where the cert chain is already trusted.
 */

import { expect, test } from "@playwright/test";

const PRIVY_ORIGIN = "https://auth.privy.io";
// A synthetic auth.privy.io path. The component keys only on
// name.startsWith("https://auth.privy.io") + responseStatus === 403, so any path on
// the origin reproduces the origin-rejection signal deterministically — without
// depending on which internal endpoint the Privy modal happens to call.
const PRIVY_PROBE = `${PRIVY_ORIGIN}/__diag_probe`;
const OTHER_ORIGIN_PROBE = "https://example.com/__diag_probe";

const RUNBOOK_LINK = /preview-deployment runbook/i;
const BLOCKED_COPY = /Privy login is blocked on this preview origin/i;

test.use({
  ignoreHTTPSErrors: true,
  launchOptions: { args: ["--ignore-certificate-errors"] },
});

// Gate: only run when explicitly enabled against a preview-env, non-bypassed server.
test.skip(
  !process.env.PRIVY_DIAG_E2E,
  "Set PRIVY_DIAG_E2E=1 and serve with NEXT_PUBLIC_VERCEL_ENV=preview (no auth bypass) to run."
);

/** Fulfill a request with a given status + headers that expose responseStatus cross-origin. */
function fulfillWithStatus(status: number) {
  return (route: import("@playwright/test").Route) =>
    route.fulfill({
      status,
      headers: {
        // ACAO lets the cors fetch resolve; TAO exposes responseStatus to the parent.
        "access-control-allow-origin": "*",
        "timing-allow-origin": "*",
        "content-type": "application/json",
      },
      body: JSON.stringify({ code: status === 403 ? "invalid_origin" : "ok" }),
    });
}

/** Drive a real, unauthenticated sign-in attempt so the diagnostic arms. */
async function attemptLogin(page: import("@playwright/test").Page) {
  // ?login=true auto-invokes the bridge login() once Privy reports ready — the same
  // path the "Sign in" button uses. This flips usePrivyLoginAttempted() (the arming
  // signal) through the REAL bridge, guarding the diagnostic against dead-code regressions.
  await page.goto("/?login=true", { waitUntil: "domcontentloaded" });
  // Privy is ready once the navbar swaps its skeleton for the real auth control.
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible({ timeout: 45_000 });
  // The Privy modal opening is external proof that login() actually fired (we are armed).
  await expect(page.locator('iframe[src*="privy.io"]').first()).toBeAttached({ timeout: 30_000 });
}

/** Emit one resource-timing entry for `url` from the page context. */
async function fireProbe(page: import("@playwright/test").Page, url: string) {
  await page.evaluate(async (u) => {
    try {
      await fetch(u, { cache: "no-store" });
    } catch {
      /* a network-level rejection still yields a resource entry */
    }
  }, url);
}

function banner(page: import("@playwright/test").Page) {
  return page.getByRole("link", { name: RUNBOOK_LINK });
}

test.describe("PrivyOriginDiagnostic — preview origin-block detection (real browser)", () => {
  test("trips on an auth.privy.io 403 after a real login attempt", async ({ page }) => {
    await page.route("**/__diag_probe*", (route) => {
      if (route.request().url().startsWith(PRIVY_ORIGIN)) return fulfillWithStatus(403)(route);
      return route.continue();
    });

    await attemptLogin(page);
    // Armed, but no origin rejection has occurred yet → no banner.
    await expect(banner(page)).toHaveCount(0);

    await fireProbe(page, PRIVY_PROBE);

    await expect(banner(page)).toBeVisible();
    await expect(page.getByText(BLOCKED_COPY)).toBeVisible();
  });

  test("stays hidden when no login was attempted (not armed)", async ({ page }) => {
    await page.route("**/__diag_probe*", fulfillWithStatus(403));

    // Land on the app but never trigger sign-in → the observer is never registered.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible({ timeout: 45_000 });

    await fireProbe(page, PRIVY_PROBE);
    // Give any (incorrectly-registered) observer a chance to fire before asserting absence.
    await page.waitForTimeout(1_000);

    await expect(banner(page)).toHaveCount(0);
  });

  test("does not false-positive on a successful (200) auth response", async ({ page }) => {
    await page.route("**/__diag_probe*", fulfillWithStatus(200));

    await attemptLogin(page);
    await fireProbe(page, PRIVY_PROBE);
    await page.waitForTimeout(1_000);

    await expect(banner(page)).toHaveCount(0);
  });

  test("ignores a 403 from a non-Privy origin", async ({ page }) => {
    await page.route("**/__diag_probe*", fulfillWithStatus(403));

    await attemptLogin(page);
    await fireProbe(page, OTHER_ORIGIN_PROBE);
    await page.waitForTimeout(1_000);

    await expect(banner(page)).toHaveCount(0);
  });

  test("can be dismissed", async ({ page }) => {
    await page.route("**/__diag_probe*", (route) => {
      if (route.request().url().startsWith(PRIVY_ORIGIN)) return fulfillWithStatus(403)(route);
      return route.continue();
    });

    await attemptLogin(page);
    await fireProbe(page, PRIVY_PROBE);
    const dismiss = page.getByRole("button", { name: /dismiss privy preview origin warning/i });
    await expect(dismiss).toBeVisible();

    // Arming leaves the Privy login modal open; its full-viewport headlessui overlay
    // sits above the bottom banner and would otherwise swallow the click. Remove that
    // portal to reproduce the real sequence — user closes the modal, then dismisses the
    // advisory — and confirm the banner is still shown before dismissing.
    await page.evaluate(() => {
      for (const n of document.querySelectorAll("#headlessui-portal-root")) n.remove();
    });
    await expect(banner(page)).toBeVisible();

    // The floating "Open chat" FAB (z-[9999], bottom-right) overlaps the banner's
    // dismiss control, so dispatch the click straight to the button: this exercises the
    // component's real onClick (sets dismissed -> hides the banner), which is the
    // behavior under test, without depending on unrelated app chrome z-order.
    await dismiss.dispatchEvent("click");

    await expect(banner(page)).toHaveCount(0);
  });
});
