/**
 * Mock for @sentry/nextjs
 *
 * @sentry/nextjs ships ESM-only client bundles that fail to load in jsdom.
 * This alias mock prevents SyntaxError during module resolution.
 */
export const captureException = vi.fn();
export const captureMessage = vi.fn();
export const setUser = vi.fn();
export const setTag = vi.fn();
export const setContext = vi.fn();
export const init = vi.fn();
export const withSentryConfig = vi.fn((config: unknown) => config);
export const addIntegration = vi.fn();
export const lazyLoadIntegration = vi.fn().mockResolvedValue(vi.fn());
