export interface E2EAuthState {
  authenticated?: boolean;
  ready?: boolean;
  user?: {
    /** Always {@link E2E_MOCK_USER_ID}; the fixture cannot choose it. */
    id?: string;
    wallet?: {
      address?: string;
    };
  };
}

/**
 * The distinct id a mock-authenticated E2E session identifies as.
 *
 * Without one, Privy produces no `user` under the bypass, so `AnalyticsProvider`
 * has no id to identify and gates OFF every authenticated emission — which made
 * all authenticated analytics untestable under Playwright.
 *
 * Deliberately not a shape Privy can mint: real DIDs are `did:privy:` followed
 * by a lowercase-alphanumeric cuid, with no hyphen. So this id can never
 * collide with a real user, and a production row carrying it is proof of a
 * misconfigured bypass rather than a real session.
 */
export const E2E_MOCK_USER_ID = "did:privy:e2e-mock-user";

/** A real Privy DID: the prefix, then a lowercase-alphanumeric cuid. */
const REAL_PRIVY_DID = /^did:privy:[a-z0-9]+$/;

// Fails at module load if the id is ever "tidied" into something Privy could
// actually issue — the whole guarantee above rests on it staying impossible.
if (REAL_PRIVY_DID.test(E2E_MOCK_USER_ID)) {
  throw new Error(
    `E2E_MOCK_USER_ID must not look like a real Privy DID, got "${E2E_MOCK_USER_ID}"`
  );
}

/** @deprecated Use E2EAuthState instead */
export type CypressAuthState = E2EAuthState;

const E2E_AUTH_STATE_STORAGE_KEY = "privy:auth_state";

const isE2EAuthBypassEnabled = (): boolean => process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true";

/**
 * Detects whether the app is running inside an E2E test runner.
 * Supports the generic __e2e flag (set by Playwright fixtures) and
 * the legacy Playwright runtime object.
 */
const isE2ETestRunner = (): boolean => {
  if (typeof window === "undefined") return false;
  const win = window as Window & { __e2e?: unknown; __playwright?: unknown };
  return Boolean(win.__e2e) || Boolean(win.__playwright);
};

export const getE2EMockAuthState = (): E2EAuthState | null => {
  if (!isE2EAuthBypassEnabled()) return null;
  if (!isE2ETestRunner()) return null;

  try {
    const rawState = localStorage.getItem(E2E_AUTH_STATE_STORAGE_KEY);
    if (!rawState) return null;

    const parsedState = JSON.parse(rawState) as E2EAuthState;
    if (parsedState.authenticated === true) {
      // The fixture supplies the wallet; the id is ours, so a test cannot
      // invent one — and this is only reachable behind the two guards above.
      return { ...parsedState, user: { ...parsedState.user, id: E2E_MOCK_USER_ID } };
    }
  } catch {
    // Ignore invalid test auth payloads and fall back to real auth state.
  }

  return null;
};

/** @deprecated Use getE2EMockAuthState instead */
export const getCypressMockAuthState = getE2EMockAuthState;
