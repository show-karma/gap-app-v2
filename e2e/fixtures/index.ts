import { test as base, expect } from "@playwright/test";
import type { MockUserRole } from "../data/users";
import { mock404, mockError, mockJson, setupApiMocks } from "./api-mocks";
import { loginAs, logout } from "./auth";
import { setupWhitelabelContext, TENANTS, type TenantConfig } from "./whitelabel";

type RouteHandler = (route: import("@playwright/test").Route) => Promise<void> | void;

/**
 * Extended Playwright test with custom fixtures for GAP E2E tests.
 *
 * Usage:
 * ```ts
 * import { test, expect } from "@e2e/fixtures";
 *
 * test("admin can see dashboard", async ({ page, loginAs, withApiMocks }) => {
 *   await withApiMocks();
 *   await loginAs("communityAdmin");
 *   await page.goto("/dashboard");
 *   // ...assertions
 * });
 * ```
 */
export const test = base.extend<{
  loginAs: (role: MockUserRole) => Promise<void>;
  withApiMocks: (overrides?: Record<string, RouteHandler>) => Promise<void>;
  withTenant: (slug: string) => Promise<TenantConfig>;
}>({
  loginAs: async ({ page }, use) => {
    await use((role: MockUserRole) => loginAs(page, role));
  },

  withApiMocks: async ({ page }, use) => {
    await use((overrides?: Record<string, RouteHandler>) => setupApiMocks(page, overrides));
  },

  withTenant: async ({ page }, use) => {
    await use((slug: string) => setupWhitelabelContext(page, slug));
  },
});

export { expect, mockJson, mockError, mock404, TENANTS };
export type { TenantConfig, MockUserRole };
