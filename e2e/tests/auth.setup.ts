import path from "node:path";
import { test as setup } from "@playwright/test";

// Resolve relative to the e2e/ directory (same as playwright.config.ts)
const STORAGE_STATE_PATH = path.join(__dirname, "..", ".auth", "user.json");

/**
 * Playwright setup project that authenticates once via Privy and saves
 * the browser storage state. All authenticated test projects reuse this
 * state instead of logging in for every test.
 *
 * Only runs when QA_TEST_EMAIL is set (CI). Locally with E2E bypass,
 * auth is handled per-test via localStorage injection.
 */
// The OTP path can legitimately take ~60s (Privy email dispatch under load)
// plus token minting and navigation, so 120s left almost no headroom and a
// slightly slow login tripped the overall timeout. 180s covers a worst-case
// OTP login; the cached-session fast path returns in a few seconds.
setup.setTimeout(180_000);

setup("authenticate via Privy", async ({ page, browser }) => {
  const email = process.env.QA_TEST_EMAIL;
  const otp = process.env.QA_TEST_OTP;

  if (!email || !otp) {
    if (process.env.CI) {
      throw new Error("QA_TEST_EMAIL and QA_TEST_OTP must be set in CI for Privy auth setup");
    }
    // Local dev without test account — skip setup. Tests will use E2E bypass.
    return;
  }

  // Fast path: a previously saved storage state (restored from CI cache)
  // may still hold a valid Privy session — the SDK refreshes privy:token
  // from the refresh token on page load. Reusing it avoids sending an OTP
  // email at all, which is what keeps us under Privy's per-address send
  // rate limits (the dominant cause of flaky CI logins).
  const fs = await import("node:fs");
  if (fs.existsSync(STORAGE_STATE_PATH) && fs.statSync(STORAGE_STATE_PATH).size > 0) {
    // Probe the cached session in a throwaway context, fully isolated and
    // tightly bounded. Two hazards this guards against (both seen failing CI):
    //   1. A slow probe.goto against staging must not consume the OTP
    //      fallback's time budget — bound it to 20s.
    //   2. A teardown protocol race (Target.disposeBrowserContext) must never
    //      propagate; it previously bubbled up and left the fixture `page`
    //      dead, so the OTP fallback's page.goto failed and the whole setup
    //      timed out. The probe never touches the fixture `page`, and close
    //      is best-effort.
    const probeContext = await browser
      .newContext({ storageState: STORAGE_STATE_PATH })
      .catch(() => null);
    if (probeContext) {
      let reused = false;
      try {
        const probe = await probeContext.newPage();
        await probe.goto("/", { waitUntil: "domcontentloaded", timeout: 20_000 });
        const refreshed = await probe
          .waitForFunction(() => localStorage.getItem("privy:token") !== null, {
            timeout: 15_000,
          })
          .then(() => true)
          .catch(() => false);
        if (refreshed) {
          // Re-save so the freshly refreshed token is what gets cached.
          await probe.waitForTimeout(1000);
          await probeContext.storageState({ path: STORAGE_STATE_PATH });
          reused = true;
        }
      } catch (err) {
        console.log(`Cached session probe failed (${err}) — falling back to OTP login`);
      } finally {
        await probeContext.close().catch(() => {});
      }
      if (reused) {
        console.log("Reused cached Privy session — skipped OTP login");
        return;
      }
      console.log("Cached Privy session expired — falling back to OTP login");
    }
  }

  // Navigate to the homepage to load the app and Privy SDK
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("body").waitFor({ state: "visible" });

  // Click the Sign in button to open the Privy dialog
  const signInButton = page.getByRole("button", { name: /sign in/i });
  await signInButton.waitFor({ state: "visible", timeout: 30000 });
  await signInButton.click();

  // Wait for the Privy email input to appear
  const privyModal = page.locator("#privy-modal-content");
  const emailInput = privyModal.locator("input#email-input, input[type='email']").first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(email);

  // Click the Submit button to send the OTP
  const submitButton = privyModal.getByRole("button", { name: /^submit$/i });
  await submitButton.waitFor({ state: "visible", timeout: 5000 });
  await submitButton.click();

  // Check for rate-limit error before waiting for OTP
  const rateLimitError = privyModal.getByText(/too many attempts|rate limit/i);
  const otpInput = privyModal
    .locator(
      'input[aria-label*="code" i], input[autocomplete="one-time-code"], input[type="tel"], input[inputmode="numeric"]'
    )
    .first();

  // Race: either OTP input appears or we get a rate-limit error. 60s, not
  // 30s — OTP email dispatch latency on Privy's side regularly exceeds 30s
  // under load, and a premature timeout here both fails the job and burns
  // another send against the per-address rate limit on the next attempt.
  const result = await Promise.race([
    otpInput.waitFor({ state: "visible", timeout: 60000 }).then(() => "otp" as const),
    rateLimitError
      .waitFor({ state: "visible", timeout: 60000 })
      .then(() => "rate-limited" as const),
  ]);

  if (result === "rate-limited") {
    throw new Error(
      "Privy rate-limited this login attempt ('Too many attempts'). " +
        "Wait a few minutes before re-running, or check Privy dashboard test user config."
    );
  }

  // Privy renders the OTP as six segmented single-digit boxes that advance on
  // each keystroke. locator.fill() sets the value programmatically and does
  // NOT fire the per-digit keydown/input handlers Privy listens to, so the
  // boxes stayed empty and auth never completed (the boxes are blank in the
  // failure screenshot). Type the code as real keypresses instead: focus the
  // first box and let page.keyboard.type follow Privy's auto-advance, which
  // distributes the digits across the boxes. This also works for the
  // single-field variant (all digits land in the one input).
  await otpInput.click();
  await page.keyboard.type(otp, { delay: 60 });

  // Wait for authentication to complete — privy:token should appear in
  // localStorage. Give it more room than before: token minting after the
  // final digit can lag a few seconds on staging, and a premature failure
  // here wastes the OTP we just spent against the per-address rate limit.
  await page.waitForFunction(
    () => {
      const token = localStorage.getItem("privy:token");
      return token !== null;
    },
    { timeout: 45000 }
  );

  // Wait for auth state to propagate
  await page.waitForTimeout(2000);

  // Save the authenticated browser state
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
