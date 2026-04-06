import type { Page } from "@playwright/test";
import { getPermissionsResponse } from "../data/permissions";
import type { MockUserRole } from "../data/users";
import { mockJson } from "./api-mocks";

/**
 * Authenticate via Privy's real email + OTP login flow.
 *
 * Requires QA_TEST_EMAIL and QA_TEST_OTP environment variables.
 * The OTP is a fixed code configured in the Privy dashboard for test accounts.
 *
 * Flow:
 * 1. Navigate to any page to load the app
 * 2. Click "Sign in" button to trigger Privy modal
 * 3. Enter email in the Privy iframe
 * 4. Enter OTP code
 * 5. Wait for auth to complete
 */
async function loginWithPrivy(page: Page): Promise<void> {
  const email = process.env.QA_TEST_EMAIL;
  const otp = process.env.QA_TEST_OTP;

  if (!email || !otp) {
    throw new Error(
      "QA_TEST_EMAIL and QA_TEST_OTP env vars are required for authenticated smoke tests"
    );
  }

  // Navigate to the homepage to load the app and Privy SDK
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("body").waitFor({ state: "visible" });

  // Click the Sign in button to open the Privy modal
  const signInButton = page.getByRole("button", { name: /sign in/i });
  await signInButton.waitFor({ state: "visible", timeout: 15000 });
  await signInButton.click();

  // Privy renders in an iframe — find and interact with it
  const privyFrame = page.frameLocator('iframe[title*="privy" i], iframe[src*="privy"]');

  // Enter email address
  const emailInput = privyFrame
    .getByRole("textbox", { name: /email/i })
    .or(
      privyFrame.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
    );
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(email);

  // Submit email — click the submit/continue button
  const submitButton = privyFrame
    .getByRole("button", { name: /submit|continue|log in|send/i })
    .or(privyFrame.locator('button[type="submit"]'));
  await submitButton.click();

  // Wait for OTP input to appear and fill it
  const otpInput = privyFrame
    .locator(
      'input[aria-label*="code" i], input[autocomplete="one-time-code"], input[type="tel"], input[inputmode="numeric"]'
    )
    .first();
  await otpInput.waitFor({ state: "visible", timeout: 15000 });

  // Privy may use multiple single-digit inputs or a single input for OTP
  const otpInputs = privyFrame.locator(
    'input[aria-label*="code" i], input[autocomplete="one-time-code"], input[type="tel"], input[inputmode="numeric"]'
  );
  const inputCount = await otpInputs.count();

  if (inputCount > 1) {
    // Multiple single-digit inputs — fill each one
    for (let i = 0; i < otp.length && i < inputCount; i++) {
      await otpInputs.nth(i).fill(otp[i]);
    }
  } else {
    // Single input — type the full OTP
    await otpInput.fill(otp);
  }

  // Wait for authentication to complete — Privy iframe should close
  // and the page should show authenticated state
  await page.waitForFunction(
    () => {
      const authState = localStorage.getItem("privy:token");
      return authState !== null;
    },
    { timeout: 20000 }
  );

  // Small delay for auth state to propagate through React
  await page.waitForTimeout(1000);
}

/**
 * Authenticate a Playwright page as a given role.
 *
 * In CI (QA_TEST_EMAIL set): Uses real Privy email + OTP login.
 * Locally (NEXT_PUBLIC_E2E_AUTH_BYPASS=true): Uses mock auth bypass.
 *
 * Must be called BEFORE navigating to the target page.
 */
export async function loginAs(page: Page, role: MockUserRole): Promise<void> {
  if (role === "guest") {
    return;
  }

  const hasTestAccount = !!process.env.QA_TEST_EMAIL;
  const hasE2EBypass = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true";

  if (hasTestAccount) {
    // Real Privy login — role doesn't map to different accounts (we only have one test account)
    await loginWithPrivy(page);
    return;
  }

  if (hasE2EBypass) {
    // E2E bypass (local development)
    const { MOCK_USERS } = await import("../data/users");
    const user = MOCK_USERS[role];

    await page.addInitScript(() => {
      (window as Window & { __e2e?: boolean }).__e2e = true;
    });

    await page.addInitScript(
      ({ address }) => {
        const authState = {
          authenticated: true,
          ready: true,
          user: { wallet: { address } },
        };
        localStorage.setItem("privy:auth_state", JSON.stringify(authState));
      },
      { address: user.address }
    );

    const permissionsData = getPermissionsResponse(role);
    await page.route("**/v2/auth/permissions**", mockJson(permissionsData));

    const isStaff = role === "superAdmin" || role === "registryAdmin";
    await page.route("**/auth/staff/authorized**", mockJson({ authorized: isStaff }));
    return;
  }

  throw new Error(
    "No auth method available. Set QA_TEST_EMAIL + QA_TEST_OTP for real login, " +
      "or NEXT_PUBLIC_E2E_AUTH_BYPASS=true for mock bypass."
  );
}

/**
 * Log out by clearing auth state.
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("privy:auth_state");
    localStorage.removeItem("privy:token");
    delete (window as Window & { __e2e?: boolean }).__e2e;
  });
}
