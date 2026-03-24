export interface E2EAuthState {
  authenticated?: boolean;
  ready?: boolean;
  user?: {
    wallet?: {
      address?: string;
    };
  };
}

/** @deprecated Use E2EAuthState instead */
export type CypressAuthState = E2EAuthState;

const E2E_AUTH_STATE_STORAGE_KEY = "privy:auth_state";

const isE2EAuthBypassEnabled = (): boolean => process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true";

/**
 * Detects whether the app is running inside an E2E test runner.
 * Supports Cypress (window.Cypress) and Playwright (window.__playwright).
 * TODO: Consider also checking for a custom localStorage flag set by Playwright
 * global-setup, which would be more reliable than runtime object detection.
 */
const isE2ETestRunner = (): boolean => {
  if (typeof window === "undefined") return false;
  const win = window as Window & { Cypress?: unknown; __playwright?: unknown };
  return Boolean(win.Cypress) || Boolean(win.__playwright);
};

export const getCypressMockAuthState = (): E2EAuthState | null => {
  if (!isE2EAuthBypassEnabled()) return null;
  if (!isE2ETestRunner()) return null;

  try {
    const rawState = localStorage.getItem(E2E_AUTH_STATE_STORAGE_KEY);
    if (!rawState) return null;

    const parsedState = JSON.parse(rawState) as E2EAuthState;
    if (parsedState.authenticated === true) {
      return parsedState;
    }
  } catch {
    // Ignore invalid test auth payloads and fall back to real auth state.
  }

  return null;
};
