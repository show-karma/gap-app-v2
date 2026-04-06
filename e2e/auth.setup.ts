import { test as setup } from "@playwright/test";

const STORAGE_STATE_PATH = "e2e/.auth/user.json";

/**
 * Playwright setup project that authenticates once via Privy and saves
 * the browser storage state. All authenticated test projects reuse this
 * state instead of logging in for every test.
 *
 * Only runs when QA_TEST_EMAIL is set (CI). Locally with E2E bypass,
 * auth is handled per-test via localStorage injection.
 */
setup("authenticate via Privy", async ({ page }) => {
  const email = process.env.QA_TEST_EMAIL;
  const otp = process.env.QA_TEST_OTP;

  if (!email || !otp) {
    // No test account — skip setup. Tests will use E2E bypass or fail with a clear error.
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

  // Wait for OTP input to appear and fill it
  const otpInput = privyModal
    .locator(
      'input[aria-label*="code" i], input[autocomplete="one-time-code"], input[type="tel"], input[inputmode="numeric"]'
    )
    .first();
  await otpInput.waitFor({ state: "visible", timeout: 30000 });

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
