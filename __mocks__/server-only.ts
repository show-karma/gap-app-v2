/**
 * Mock for the `server-only` marker package.
 *
 * The real package's default export condition is a module that throws
 * unconditionally — Next's bundler swaps it for a no-op via the
 * `react-server` export condition, which vitest doesn't set. Alias it to
 * this empty module (see `vitest.config.ts`'s `unitTestMockAliases`) so
 * `import "server-only"` is a no-op under test instead of a hard crash.
 */
export {};
