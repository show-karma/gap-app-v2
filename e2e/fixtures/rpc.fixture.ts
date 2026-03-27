import { test as base, type Page, type Route } from "@playwright/test";

/**
 * Supported RPC failure modes that can be injected into page-level network
 * routes to simulate backend/node failures.
 */
export type RpcFailureMode = "timeout" | "rate-limit" | "server-error" | "malformed-json";

/**
 * Options for configuring an RPC failure injection.
 */
export interface RpcFailureOptions {
  /** Which failure mode to simulate. */
  mode: RpcFailureMode;
  /**
   * Optional URL pattern to match. Defaults to all JSON-RPC endpoints
   * (any URL receiving POST requests with jsonrpc in the body).
   * Use a glob pattern such as "star-star/rpc" or a specific URL.
   */
  urlPattern?: string;
  /**
   * Only fail requests for these specific JSON-RPC methods.
   * When omitted, all RPC requests matching the URL pattern will fail.
   */
  methods?: string[];
  /**
   * For timeout mode: how long to wait before aborting (ms). Defaults to 30000.
   */
  timeoutMs?: number;
}

const DEFAULT_URL_PATTERN = "**/*";

/**
 * Create a Playwright route handler that simulates a specific RPC failure mode.
 */
function createFailureHandler(
  options: RpcFailureOptions
): (route: Route) => Promise<void> {
  return async (route: Route) => {
    const request = route.request();

    // Only intercept POST requests (JSON-RPC is always POST)
    if (request.method() !== "POST") {
      await route.continue();
      return;
    }

    // If specific methods are targeted, check the request body
    if (options.methods && options.methods.length > 0) {
      try {
        const body = request.postData();
        if (body) {
          const parsed = JSON.parse(body) as { method?: string };
          if (parsed.method && !options.methods.includes(parsed.method)) {
            await route.continue();
            return;
          }
        }
      } catch {
        // If we cannot parse the body, let it through
        await route.continue();
        return;
      }
    }

    switch (options.mode) {
      case "timeout":
        // Abort the request to simulate a network timeout
        await route.abort("timedout");
        break;

      case "rate-limit":
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32005, message: "rate limit exceeded" },
            id: null,
          }),
          headers: {
            "Retry-After": "30",
          },
        });
        break;

      case "server-error":
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "internal server error" },
            id: null,
          }),
        });
        break;

      case "malformed-json":
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: '{"jsonrpc": "2.0", "result": INVALID_JSON_HERE',
        });
        break;
    }
  };
}

/**
 * Set up RPC failure injection on a Playwright page.
 *
 * Returns a cleanup function that removes the route handler.
 */
export async function injectRpcFailure(
  page: Page,
  options: RpcFailureOptions
): Promise<() => Promise<void>> {
  const pattern = options.urlPattern ?? DEFAULT_URL_PATTERN;
  const handler = createFailureHandler(options);

  await page.route(pattern, handler);

  return async () => {
    await page.unroute(pattern, handler);
  };
}

/**
 * Set up multiple RPC failure modes at once. Useful for simulating
 * degraded network conditions where different endpoints fail differently.
 */
export async function injectMultipleRpcFailures(
  page: Page,
  failures: RpcFailureOptions[]
): Promise<() => Promise<void>> {
  const cleanups: Array<() => Promise<void>> = [];

  for (const options of failures) {
    const cleanup = await injectRpcFailure(page, options);
    cleanups.push(cleanup);
  }

  return async () => {
    for (const cleanup of cleanups) {
      await cleanup();
    }
  };
}

/**
 * Playwright fixture that provides `withRpcFailure` — a composable way
 * to inject RPC failures into the current page.
 *
 * Usage:
 * ```ts
 * import { test, expect } from "@e2e/fixtures";
 *
 * test("shows error on RPC timeout", async ({ page, withRpcFailure }) => {
 *   await withRpcFailure({ mode: "timeout", urlPattern: "**\/rpc**" });
 *   await page.goto("/");
 *   // ...assert error UI is displayed
 * });
 *
 * test("handles rate limiting", async ({ page, withRpcFailure }) => {
 *   await withRpcFailure({
 *     mode: "rate-limit",
 *     methods: ["eth_getBalance"],
 *   });
 *   await page.goto("/");
 *   // ...assert retry UI or degraded state
 * });
 * ```
 */
export const rpcFixture = base.extend<{
  withRpcFailure: (options: RpcFailureOptions) => Promise<() => Promise<void>>;
  withRpcFailures: (failures: RpcFailureOptions[]) => Promise<() => Promise<void>>;
}>({
  withRpcFailure: async ({ page }, use) => {
    const cleanups: Array<() => Promise<void>> = [];

    await use(async (options: RpcFailureOptions) => {
      const cleanup = await injectRpcFailure(page, options);
      cleanups.push(cleanup);
      return cleanup;
    });

    // Auto-cleanup all injected failures after the test
    for (const cleanup of cleanups) {
      await cleanup();
    }
  },

  withRpcFailures: async ({ page }, use) => {
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
