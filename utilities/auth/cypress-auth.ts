export interface CypressAuthState {
  authenticated?: boolean;
  ready?: boolean;
  user?: {
    wallet?: {
      address?: string;
    };
  };
}

const CYPRESS_AUTH_STATE_STORAGE_KEY = "privy:auth_state";

const isCypressAuthBypassEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true";

export const getCypressMockAuthState = (): CypressAuthState | null => {
  if (!isCypressAuthBypassEnabled()) return null;
  if (typeof window === "undefined") return null;
  if (!(window as Window & { Cypress?: unknown }).Cypress) return null;

  try {
    const rawState = localStorage.getItem(CYPRESS_AUTH_STATE_STORAGE_KEY);
    if (!rawState) return null;

    const parsedState = JSON.parse(rawState) as CypressAuthState;
    if (parsedState.authenticated === true) {
      return parsedState;
    }
  } catch {
    // Ignore invalid test auth payloads and fall back to real auth state.
  }

  return null;
};
