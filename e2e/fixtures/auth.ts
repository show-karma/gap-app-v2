import type { Page } from "@playwright/test";
import { getPermissionsResponse } from "../data/permissions";
import { MOCK_USERS, type MockUserRole } from "../data/users";
import { mockJson } from "./api-mocks";

export interface LoginOptions {
  communityId?: string;
}

/**
 * Mock the permissions and staff-authorized APIs for the given role.
 * Used in both CI (after storageState login) and local (after E2E bypass).
 */
function mockPermissions(page: Page, role: MockUserRole, options?: LoginOptions) {
  const permissionsData = getPermissionsResponse(role);
  if (options?.communityId) {
    permissionsData.resourceContext = {
      ...permissionsData.resourceContext,
      communitySlug: options.communityId,
      communityUid: `community-uid-${options.communityId}`,
    };
  }

  const isStaff = role === "superAdmin" || role === "registryAdmin";

  return Promise.all([
    page.route("**/v2/auth/permissions**", mockJson(permissionsData)),
    page.route("**/auth/staff/authorized**", mockJson({ authorized: isStaff })),
  ]);
}

/**
 * Authenticate a Playwright page as a given role.
 *
 * In CI (QA_TEST_EMAIL set): Auth session is pre-loaded via storageState
 *   from the setup project (auth.setup.ts). Only permission mocking needed.
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
    // CI: Privy session already loaded via storageState from setup project.
    // Just mock permissions to simulate the requested role.
    await mockPermissions(page, role, options);
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

    await mockPermissions(page, role, options);
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
