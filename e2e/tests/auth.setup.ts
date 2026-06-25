import path from "node:path";
import { type Browser, type Page, test as setup } from "@playwright/test";

// Resolve relative to the e2e/ directory (same as playwright.config.ts)
const STORAGE_STATE_PATH = path.join(__dirname, "..", ".auth", "user.json");

/**
 * Probe a cached Privy session in a FULLY ISOLATED browser process.
 *
 * Why a separate browser and not just a throwaway context on the shared
 * `browser` fixture: closing an extra context on the shared browser triggered
 * a Chromium CDP `Target.disposeBrowserContext` race that wedged the shared
 * browser's CDP connection. The damage was global to that browser, so the
 * fixture `page`'s later `page.goto` hung for the entire 180s budget and died
 * with "Target page, context or browser has been closed" — bounding the
 * close() call could not help, because the corruption was to the browser, not
 * the close. A dedicated browser process is independent: its teardown is a
 * process kill that cannot touch the fixture browser however it races.
 *
 * Reusing a still-valid cached session avoids sending an OTP email at all,
 * which is what keeps us under Privy's per-address send rate limits (the
 * dominant cause of flaky CI logins). `baseURL` is passed explicitly because a
 * manually-created context on a separate browser does not inherit the
 * project's `use.baseURL`.
 *
 * Returns true only when the cached session refreshed and was re-saved; any
 * failure (including the isolated launch itself) returns false so the caller
 * falls back to OTP login — i.e. it can never be worse than always-OTP.
 */
async function probeCachedSession(browser: Browser, baseURL: string | undefined): Promise<boolean> {
  // --no-sandbox keeps the probe browser working under root CI containers;
  // GitHub runners ignore it harmlessly.
  const probeBrowser = await browser
    .browserType()
    .launch({ args: ["--no-sandbox"] })
    .catch(() => null);
  if (!probeBrowser) return false;

  try {
    const probeContext = await probeBrowser.newContext({
      storageState: STORAGE_STATE_PATH,
      baseURL,
    });
    const probe = await probeContext.newPage();
    // Bound the probe goto so a slow staging response can't eat the OTP budget.
    await probe.goto("/", { waitUntil: "domcontentloaded", timeout: 20_000 });
    const refreshed = await probe
      .waitForFunction(() => localStorage.getItem("privy:token") !== null, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!refreshed) return false;

    // Re-save so the freshly refreshed token is what gets cached.
    await probe.waitForTimeout(1000);
    await probeContext.storageState({ path: STORAGE_STATE_PATH });
    return true;
  } catch (err) {
    console.info(`Cached session probe failed (${err}) — falling back to OTP login`);
    return false;
  } finally {
    // Bound the close so a slow browser shutdown can't eat the OTP budget. Even
    // if it times out, the orphaned process is separate from the fixture
    // browser and CI reaps it when the job ends.
    await Promise.race([
      probeBrowser.close().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }
}

/**
 * Navigate with a bounded timeout and a single retry. A single cold/slow
 * preview response should not consume the whole setup budget, and an
 * unbounded `page.goto` would otherwise hang until the test timeout.
 */
async function gotoWithRetry(page: Page, url: string): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      return;
    } catch (err) {
      if (attempt === 2) throw err;
      console.info(`Navigation to ${url} failed (attempt ${attempt}) — retrying: ${err}`);
    }
  }
}

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

setup("authenticate via Privy", async ({ page, browser }, testInfo) => {
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
    const baseURL = testInfo.project.use.baseURL ?? process.env.BASE_URL;
    const reused = await probeCachedSession(browser, baseURL);
    if (reused) {
      console.info("Reused cached Privy session — skipped OTP login");
      return;
    }
    console.info("Cached Privy session expired — falling back to OTP login");
  }

  // Navigate to the homepage to load the app and Privy SDK
  await gotoWithRetry(page, "/");
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
