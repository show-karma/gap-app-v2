/**
 * Is there a Privy session persisted in this browser?
 *
 * Privy writes its access token to `localStorage` under this key and reads it
 * back on boot to restore a session. Its presence is therefore the only
 * signal available BEFORE the SDK has loaded that tells a returning user from
 * an anonymous visitor.
 *
 * Two places need that answer and must agree, which is why it lives here
 * rather than inline in either:
 *
 * - `PrivyProviderWrapper` uses it to decide whether to load the ~400KB SDK
 *   immediately or defer it to an idle callback.
 * - `useAuth` uses it to decide whether a login click that arrives while
 *   `ready` is still false came from a visitor who is certainly signed out.
 */

const PRIVY_TOKEN_STORAGE_KEY = "privy:token";

/**
 * Returns true only when a persisted Privy token is readable.
 *
 * Storage can be unavailable outright (privacy mode, blocked third-party
 * storage, enterprise policy) and then ANY access throws. Unreadable storage
 * is reported as "no session" — the same answer the SDK loader acts on, so the
 * two stay consistent by construction. It is also the safe direction: a
 * visitor whose storage cannot be read has no session to restore.
 */
export function hasPersistedPrivySession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PRIVY_TOKEN_STORAGE_KEY) !== null;
  } catch {
    // SUPPRESSED: storage unavailable — treated as anonymous, matching the
    // deferred-load path `PrivyProviderWrapper` takes in exactly this case.
    return false;
  }
}
