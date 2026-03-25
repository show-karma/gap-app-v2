import type { Page } from "@playwright/test";
import { getPermissionsResponse } from "../data/permissions";
import { MOCK_USERS, type MockUserRole } from "../data/users";
import { mockJson } from "./api-mocks";

/**
 * Authenticate a Playwright page as a given role using the existing
 * E2E auth bypass mechanism.
 *
 * This works because:
 * 1. `NEXT_PUBLIC_E2E_AUTH_BYPASS=true` is set by the test scripts
 * 2. `window.__e2e = true` triggers the bypass in `e2e-auth.ts`
 * 3. localStorage `privy:auth_state` provides the mock auth state
 * 4. Permission API route returns role-appropriate permissions
 *
 * Must be called BEFORE navigating to any page.
 */
export async function loginAs(page: Page, role: MockUserRole): Promise<void> {
  if (role === "guest") {
    // Guest = unauthenticated, no setup needed
    return;
  }

  const user = MOCK_USERS[role];

  // Set window.__e2e flag to trigger E2E auth bypass
  await page.addInitScript(() => {
    (window as Window & { __e2e?: boolean }).__e2e = true;
  });

  // Set privy:auth_state in localStorage before page loads
  await page.addInitScript(
    ({ address }) => {
      const authState = {
        authenticated: true,
        ready: true,
        user: {
          wallet: { address },
        },
      };
      localStorage.setItem("privy:auth_state", JSON.stringify(authState));
    },
    { address: user.address }
  );

  // Mock the permissions endpoint with role-appropriate response
  const permissionsData = getPermissionsResponse(role);
  await page.route("**/v2/auth/permissions**", mockJson(permissionsData));

  // Mock staff authorization for admin roles
  const isStaff = role === "superAdmin" || role === "registryAdmin";
  await page.route("**/auth/staff/authorized**", mockJson({ authorized: isStaff }));
}

/**
 * Log out by clearing auth state. Useful for testing sign-out flows.
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("privy:auth_state");
    delete (window as Window & { __e2e?: boolean }).__e2e;
  });
}
