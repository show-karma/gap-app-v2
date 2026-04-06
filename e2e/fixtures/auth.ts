import type { Page } from "@playwright/test";
import { getPermissionsResponse } from "../data/permissions";
import { MOCK_USERS, type MockUserRole } from "../data/users";
import { mockJson } from "./api-mocks";

export interface LoginOptions {
  communityId?: string;
}

/**
 * Authenticate via Privy's real email + OTP login flow.
 *
 * Requires QA_TEST_EMAIL and QA_TEST_OTP environment variables.
 * The OTP is a fixed code configured in the Privy dashboard for test accounts.
 *
 * Privy renders its login UI as a dialog in the main page DOM (not an iframe).
 * The dialog contains an email input (input#email-input) and a "Submit" button.
 * After submitting the email, an OTP screen appears with numeric inputs.
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

  // Click the Sign in button to open the Privy dialog
  const signInButton = page.getByRole("button", { name: /sign in/i });
  await signInButton.waitFor({ state: "visible", timeout: 15000 });
  await signInButton.click();

  // Wait for the Privy email input to appear (rendered in main page DOM, not an iframe).
  // The dialog wrapper may be aria-hidden during CSS animation, so target the input directly.
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
  await otpInput.waitFor({ state: "visible", timeout: 15000 });

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

  // Wait for authentication to complete — dialog should close
  // and privy:token should appear in localStorage
  await page.waitForFunction(
    () => {
      const token = localStorage.getItem("privy:token");
      return token !== null;
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
export async function loginAs(
  page: Page,
  role: MockUserRole,
  options?: LoginOptions
): Promise<void> {
  if (role === "guest") {
    return;
  }

  const hasTestAccount = !!process.env.QA_TEST_EMAIL;
  const hasE2EBypass = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true";

  if (hasTestAccount) {
    // Real Privy login — one test account for all roles.
    // After login, mock the permissions API to simulate the requested role.
    await loginWithPrivy(page);

    const permissionsData = getPermissionsResponse(role);
    if (options?.communityId) {
      permissionsData.resourceContext = {
        ...permissionsData.resourceContext,
        communitySlug: options.communityId,
        communityUid: `community-uid-${options.communityId}`,
      };
    }
    await page.route("**/v2/auth/permissions**", mockJson(permissionsData));

    const isStaff = role === "superAdmin" || role === "registryAdmin";
    await page.route("**/auth/staff/authorized**", mockJson({ authorized: isStaff }));
    return;
  }

  if (hasE2EBypass) {
    // E2E bypass (local development)
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
    if (options?.communityId) {
      permissionsData.resourceContext = {
        ...permissionsData.resourceContext,
        communitySlug: options.communityId,
        communityUid: `community-uid-${options.communityId}`,
      };
    }
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
