"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { watchAccount } from "@wagmi/core";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { TokenManager } from "@/utilities/auth/token-manager";
import { queryClient } from "@/utilities/query-client";
import { privyConfig } from "@/utilities/wagmi/privy-config";

/**
 * Initial delay (in ms) before first auth status check.
 * Gives Privy a moment to initialize before we start checking.
 */
const AUTH_INIT_DELAY_MS = 500;

/**
 * Interval (in ms) for periodic auth status checks.
 * Used for cross-tab logout synchronization.
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
 * Authentication hook that wraps Privy's built-in authentication
 *
 * Privy handles all the complexity:
 * - Token management and refresh
 * - Session persistence
 * - Cross-tab synchronization
 * - Cookie management
 * - Wallet connections
 */
export const useAuth = () => {
  const { ready, authenticated, user, login, logout, getAccessToken, connectWallet } = usePrivy();

  const { isConnected } = useAccount();

  const { wallets } = useWallets();
  const primaryWallet = wallets[0];
  const address = primaryWallet?.address as Hex | undefined;

  const shouldLoginAfterLogout = useRef(false);
  const prevAuthRef = useRef(authenticated);
  const prevUserIdRef = useRef<string | undefined>(user?.id);
  const authFailureCount = useRef(0);

  /**
   * AUTH STATE CHANGE DETECTION
   *
   * Detects two critical transitions:
   * 1. Logout (authenticated → false): Clear all query caches + token cache
   * 2. User switch (user.id changes while authenticated): Clear stale caches
   *
   * Uses queryClient.clear() instead of selective removeQueries to ensure
   * ALL user-specific data is purged, not just a hardcoded list of keys.
   */
  useEffect(() => {
    // Detect logout: was authenticated, now not authenticated
    if (prevAuthRef.current && !authenticated) {
      // Clear ALL query caches on logout to prevent stale data on re-login.
      // Using clear() instead of selective removeQueries because:
      // - removeQueries only clears explicitly listed keys (easy to miss new ones)
      // - clear() is safe on logout since unauthenticated state needs fresh data anyway
      queryClient.clear();
      TokenManager.clearCache();
      authFailureCount.current = 0;
    }

    // Detect user switch: different user.id while still authenticated.
    // This happens with Privy shared auth when a different user logs in
    // on another subdomain — Privy seamlessly transitions without logout.
    // Force logout to ensure full re-initialization with the new user's state.
    if (authenticated && user?.id && prevUserIdRef.current && user.id !== prevUserIdRef.current) {
      queryClient.clear();
      TokenManager.clearCache();
      logout();
    }

    prevAuthRef.current = authenticated;
    prevUserIdRef.current = user?.id;
  }, [authenticated, user?.id, logout]);

  // Initialize TokenManager with Privy synchronously
  // This must happen before any API calls are made, so we do it outside useEffect
  if (ready) {
    TokenManager.setPrivyInstance({ getAccessToken });
  }

  // Auto-login after logout completes
  useEffect(() => {
    if (shouldLoginAfterLogout.current && !authenticated && ready) {
      shouldLoginAfterLogout.current = false;
      login();
    }
  }, [authenticated, ready, login]);

  // Cross-tab logout synchronization
  // Compatible with both localStorage (default) and HttpOnly cookies
  useEffect(() => {
    if (!ready || !authenticated) return;

    const handleAuthFailure = () => {
      authFailureCount.current += 1;
      if (authFailureCount.current >= AUTH_FAILURE_THRESHOLD) {
        authFailureCount.current = 0;
        logout();
      }
    };

    const checkAuthStatus = async () => {
      try {
        const hasToken = await TokenManager.getToken();
        const hasSession = hasPrivySession();

        // If we have either a token or session, auth is valid - reset failure counter
        if (hasToken || hasSession) {
          authFailureCount.current = 0;
          return;
        }

        // No token AND no session - increment failure counter
        // Only logout after multiple consecutive failures to handle:
        // - Slow network during token refresh
        // - Temporary network hiccups
        // - Privy initialization timing
        handleAuthFailure();
      } catch {
        // Token check failed (network error, etc.) - treat as a failure
        handleAuthFailure();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "privy:token") {
        // Token removed → cross-tab logout
        // Token replaced → possible user switch (shared auth)
        if (!e.newValue || (e.oldValue && e.newValue !== e.oldValue)) {
          checkAuthStatus();
        }
      }
      // User identity changed in another tab (e.g., shared auth login)
      if (e.key === "privy:user" && e.oldValue !== e.newValue) {
        checkAuthStatus();
      }
    };

    // Don't check immediately on mount - give time for token refresh.
    // This prevents false logouts when using HttpOnly cookies.
    // Note: Privy's `ready` state doesn't guarantee token refresh is complete,
    // so we use a grace period as a workaround.
    const initialCheckTimeout = setTimeout(checkAuthStatus, AUTH_INIT_DELAY_MS);

    const intervalId = setInterval(checkAuthStatus, AUTH_CHECK_INTERVAL_MS);

    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(intervalId);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [ready, authenticated, logout]);

  // Handle wallet switching: logout if switched to non-linked wallet
  // Using wagmi's watchAccount as recommended by Privy docs
  useEffect(() => {
    if (!ready || !authenticated) return;

    // Watch for account changes in the EOA wallet
    const unwatch = watchAccount(privyConfig, {
      onChange(account) {
        // Get the new address from the wallet
        const newAddress = account.address?.toLowerCase();

        if (!newAddress) return;

        // Get all linked wallet addresses from Privy
        const linkedAddresses = wallets.map((w) => w.address.toLowerCase());

        // If the new address is NOT in the linked wallets, log out
        if (!linkedAddresses.includes(newAddress)) {
          logout();
        }
      },
    });

    // Cleanup watcher on unmount
    return () => unwatch();
  }, [ready, authenticated, wallets, logout]);

  const adaptedLogin = useCallback(async () => {
    // If authenticated but wallet not connected, force logout first
    if (!isConnected && authenticated) {
      shouldLoginAfterLogout.current = true;
      await logout();
      return;
    }
    login();
  }, [isConnected, authenticated, logout, login]);

  const connectedAndAuth = useMemo(() => {
    return isConnected && authenticated;
  }, [isConnected, authenticated]);

  return {
    // Core authentication (Privy handles everything)
    authenticate: adaptedLogin, // Just use Privy's login
    disconnect: logout, // Just use Privy's logout

    // State from Privy
    ready,
    authenticated: connectedAndAuth,
    isConnected,
    user,
    address,
    primaryWallet,
    wallets,

    // Privy methods
    login: adaptedLogin,
    logout,
    getAccessToken,
    connectWallet, // Connect wallet without full login
  };
};
