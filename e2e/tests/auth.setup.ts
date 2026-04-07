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
setup.setTimeout(60_000);

setup("authenticate via Privy", async ({ page }) => {
  const email = process.env.QA_TEST_EMAIL;
  const otp = process.env.QA_TEST_OTP;

  if (!email || !otp) {
    if (process.env.CI) {
      throw new Error("QA_TEST_EMAIL and QA_TEST_OTP must be set in CI for Privy auth setup");
    }
    // Local dev without test account — skip setup. Tests will use E2E bypass.
    return;
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

  // Race: either OTP input appears or we get a rate-limit error
  const result = await Promise.race([
    otpInput.waitFor({ state: "visible", timeout: 30000 }).then(() => "otp" as const),
    rateLimitError
      .waitFor({ state: "visible", timeout: 30000 })
      .then(() => "rate-limited" as const),
  ]);

  if (result === "rate-limited") {
    throw new Error(
      "Privy rate-limited this login attempt ('Too many attempts'). " +
        "Wait a few minutes before re-running, or check Privy dashboard test user config."
    );
  }

  // Privy may use multiple single-digit inputs or a single input for OTP
  const otpInputs = privyModal.locator(
    'input[aria-label*="code" i], input[autocomplete="one-time-code"], input[type="tel"], input[inputmode="numeric"]'
  );
  const inputCount = await otpInputs.count();

  if (inputCount > 1) {
    for (let i = 0; i < otp.length && i < inputCount; i++) {
      await otpInputs.nth(i).fill(otp[i]);
    }
  } else {
    await otpInput.fill(otp);
  }

  // Wait for authentication to complete — privy:token should appear in localStorage
  await page.waitForFunction(
    () => {
      const token = localStorage.getItem("privy:token");
      return token !== null;
    },
    { timeout: 30000 }
  );

  // Wait for auth state to propagate
  await page.waitForTimeout(2000);

  // Save the authenticated browser state
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
