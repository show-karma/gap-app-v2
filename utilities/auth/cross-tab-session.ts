/**
 * Cross-tab session synchronisation: noticing that the session ended somewhere
 * else and ending it here too.
 *
 * Extracted from `useAuth` — the hook was well over its size budget and this is
 * a self-contained watcher with its own timers, thresholds and Privy storage
 * knowledge. Compatible with both localStorage (default) and HttpOnly cookies.
 */

import { TokenManager } from "@/utilities/auth/token-manager";

/**
 * Initial delay (in ms) before first auth status check.
 * Gives Privy a moment to initialize before we start checking.
 */
const AUTH_INIT_DELAY_MS = 500;

/**
 * Interval (in ms) for periodic auth status checks.
 *
 * The interval can be short because TokenManager caches tokens for 30s,
 * so most checks are cache hits (no Privy API call). Only ~2 actual API
 * calls/min regardless of interval. Storage events provide instant detection.
 */
const AUTH_CHECK_INTERVAL_MS = 10_000;

/**
 * Number of consecutive failures (no token AND no session) required before logging out.
 * This prevents false logouts during temporary network issues or slow token refresh.
 * With a 500ms initial delay and checks every 10s, 3 failures = ~20s of no auth state.
 * Storage events provide faster detection for cross-tab logouts.
 */
const AUTH_FAILURE_THRESHOLD = 3;

/**
 * Cookie name used by Privy for session persistence in HttpOnly mode.
 * This is an implementation detail of Privy - if Privy changes this, the check may need updating.
 * @see https://docs.privy.io/guide/react/configuration/cookies
 */
const PRIVY_SESSION_COOKIE_NAME = "privy-session";

/**
 * Check if privy-session cookie exists using proper cookie parsing.
 * If session exists, user might be in the middle of token refresh (HttpOnly cookies mode).
 */
// Note: privy-session is a JS-readable indicator cookie, NOT HttpOnly.
// Privy's HttpOnly cookies are separate and used for token refresh.
// If this cookie is ever made HttpOnly, the check degrades gracefully —
// the failure threshold alone still prevents false logouts.
const hasPrivySession = () => {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${PRIVY_SESSION_COOKIE_NAME}=`));
};

/**
 * Starts watching for a session that ended in another tab, and returns the
 * teardown for the caller's effect.
 *
 * `failureCount` is owned by the caller (a ref) so it survives across the
 * effect's re-runs and can be reset from the logout path.
 */
export function watchCrossTabSession(options: {
  failureCount: { current: number };
  onSessionGone: () => void;
}): () => void {
  const { failureCount, onSessionGone } = options;

  const handleAuthFailure = () => {
    failureCount.current += 1;
    if (failureCount.current >= AUTH_FAILURE_THRESHOLD) {
      failureCount.current = 0;
      onSessionGone();
    }
  };

  const checkAuthStatus = async () => {
    try {
      const hasToken = await TokenManager.getToken();

      // Either a token or a session means auth is valid — reset the counter.
      if (hasToken || hasPrivySession()) {
        failureCount.current = 0;
        return;
      }

      // No token AND no session. Only log out after multiple consecutive
      // failures, to survive slow networks during token refresh, temporary
      // hiccups, and Privy initialization timing.
      handleAuthFailure();
    } catch {
      // SUPPRESSED: not swallowed — a failed token check (network error, etc.)
      // is deliberately routed into the consecutive-failure counter above, so
      // a transient hiccup can't log the user out on its own.
      handleAuthFailure();
    }
  };

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === "privy:token") {
      // Token removed → cross-tab logout.
      // Token replaced → possible user switch (shared auth).
      if (!e.newValue || (e.oldValue && e.newValue !== e.oldValue)) {
        void checkAuthStatus();
      }
    }
    // User identity changed in another tab (e.g. shared auth login).
    if (e.key === "privy:user" && e.oldValue !== e.newValue) {
      void checkAuthStatus();
    }
  };

  // Don't check immediately on mount — give time for token refresh. This
  // prevents false logouts when using HttpOnly cookies. Privy's `ready` state
  // doesn't guarantee token refresh is complete, so the grace period stands in.
  const initialCheckTimeout = setTimeout(checkAuthStatus, AUTH_INIT_DELAY_MS);
  const intervalId = setInterval(checkAuthStatus, AUTH_CHECK_INTERVAL_MS);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    clearTimeout(initialCheckTimeout);
    clearInterval(intervalId);
    window.removeEventListener("storage", handleStorageChange);
  };
}
