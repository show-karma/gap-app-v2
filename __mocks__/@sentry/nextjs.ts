/**
 * Mock for @sentry/nextjs
 *
 * @sentry/nextjs ships ESM-only client bundles that fail to load in jsdom.
 * This alias mock prevents SyntaxError during module resolution.
 */
export const captureException = vi.fn();
export const captureMessage = vi.fn();
export const addBreadcrumb = vi.fn();
export const setUser = vi.fn();
export const setTag = vi.fn();
export const setContext = vi.fn();
export const init = vi.fn();
export const withSentryConfig = vi.fn((config: unknown) => config);
export const addIntegration = vi.fn();
export const lazyLoadIntegration = vi.fn().mockResolvedValue(vi.fn());

// Shared Scope stub so `Sentry.withScope((scope) => { ... })` records the
// level/fingerprint/tags/extras a caller sets before `captureMessage`. Exposed
// as `__scope` so tests can assert on what the caller configured; its spies
// are cleared by `vi.clearAllMocks()` like every other mock here.
export const __scope = {
  setLevel: vi.fn(),
  setFingerprint: vi.fn(),
  setTag: vi.fn(),
  setTags: vi.fn(),
  setExtra: vi.fn(),
  setExtras: vi.fn(),
  setContext: vi.fn(),
};

export const withScope = vi.fn((callback: (scope: typeof __scope) => void) => {
  callback(__scope);
});
