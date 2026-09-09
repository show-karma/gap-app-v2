/**
 * The ONLY sandbox token the notebook frame may ever carry.
 *
 * The notebook bundle runs tenant-authored code. It is served from its own
 * origin (`utilities/domains.ts`, notebooksOrigin()), and `allow-scripts`
 * alone keeps the document on an opaque origin regardless: no cookies, no
 * storage, no parent DOM, no ambient credentials on any host. Adding
 * `allow-same-origin` would give the bundle its real origin back — and with
 * it whatever that host is allowed to reach. It is a sandbox escape, not a
 * fallback, and there is no configuration in which it is acceptable.
 *
 * Lives outside the component file so the invariant test asserts the same
 * constant the component renders. `__tests__/app/notebook-sandbox.test.tsx`
 * additionally asserts the RENDERED attribute, so a wrapper or sanitizer that
 * rewrote it could not slip past a source-level check.
 */
export const NOTEBOOK_SANDBOX = "allow-scripts" as const;

/** Forbidden tokens, named so the failure message says why. */
export const FORBIDDEN_SANDBOX_TOKENS = [
  "allow-same-origin",
  "allow-top-navigation",
  "allow-popups-to-escape-sandbox",
] as const;
