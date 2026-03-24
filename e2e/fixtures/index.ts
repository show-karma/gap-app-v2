import { test as base, expect } from "@playwright/test";
import type { MockUserRole } from "../data/users";
import { mock404, mockError, mockJson, setupApiMocks } from "./api-mocks";
import { type AnvilConfig, anvilFixture } from "./anvil.fixture";
import { loginAs, logout } from "./auth";
import { type RpcFailureOptions, rpcFixture } from "./rpc.fixture";
import { type WalletConfig, walletFixture } from "./wallet.fixture";
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
  withWallet: (overrides?: Partial<WalletConfig>) => Promise<WalletConfig>;
  withRpcFailure: (options: RpcFailureOptions) => Promise<() => Promise<void>>;
  withRpcFailures: (failures: RpcFailureOptions[]) => Promise<() => Promise<void>>;
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

  // Delegate to walletFixture's implementation
  withWallet: async ({ page }, use) => {
    const { injectMockWallet } = await import("./wallet.fixture");
    await use((overrides?: Partial<WalletConfig>) => injectMockWallet(page, overrides));
  },

  // Delegate to rpcFixture's implementation
  withRpcFailure: async ({ page }, use) => {
    const { injectRpcFailure } = await import("./rpc.fixture");
    const cleanups: Array<() => Promise<void>> = [];

    await use(async (options: RpcFailureOptions) => {
      const cleanup = await injectRpcFailure(page, options);
      cleanups.push(cleanup);
      return cleanup;
    });

    for (const cleanup of cleanups) {
      await cleanup();
    }
  },

  withRpcFailures: async ({ page }, use) => {
    const { injectMultipleRpcFailures } = await import("./rpc.fixture");
    const cleanups: Array<() => Promise<void>> = [];

    await use(async (failures: RpcFailureOptions[]) => {
      const cleanup = await injectMultipleRpcFailures(page, failures);
      cleanups.push(cleanup);
      return cleanup;
    });

    for (const cleanup of cleanups) {
      await cleanup();
    }
  },
});

export { expect, mockJson, mockError, mock404, TENANTS };
export type { TenantConfig, MockUserRole, WalletConfig, RpcFailureOptions, AnvilConfig };

// Re-export standalone fixtures for tests that need only the Anvil fork
// without the full GAP fixture set (e.g., *.anvil.spec.ts files).
export { anvilFixture } from "./anvil.fixture";
export { walletFixture } from "./wallet.fixture";
export { rpcFixture } from "./rpc.fixture";
