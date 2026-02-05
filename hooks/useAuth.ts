"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { watchAccount } from "@wagmi/core";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { TokenManager } from "@/utilities/auth/token-manager";
import { queryClient } from "@/utilities/query-client";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { privyConfig } from "@/utilities/wagmi/privy-config";

/**
 * Initial delay (in ms) before first auth status check.
 * Gives Privy a moment to initialize before we start checking.
 */
const AUTH_INIT_DELAY_MS = 500;

/**
 * Interval (in ms) for periodic auth status checks.
 * Used for cross-tab logout synchronization.
 */
const AUTH_CHECK_INTERVAL_MS = 5000;

/**
 * Number of consecutive failures (no token AND no session) required before logging out.
 * This prevents false logouts during temporary network issues or slow token refresh.
 * With a 500ms initial delay and checks every 5s, 3 failures = ~10.5s of no auth state.
 */
const AUTH_FAILURE_THRESHOLD = 3;

/**
 * Cookie name used by Privy for session persistence in HttpOnly mode.
 * This is an implementation detail of Privy - if Privy changes this, the check may need updating.
 * @see https://docs.privy.io/guide/react/configuration/cookies
 */
const PRIVY_SESSION_COOKIE_NAME = "privy-session";

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
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();

  const { isConnected } = useAccount();

  const { wallets } = useWallets();
  const primaryWallet = wallets[0];
  const address = primaryWallet?.address as Hex | undefined;

  const shouldLoginAfterLogout = useRef(false);
  const prevAuthRef = useRef(authenticated);
  const authFailureCount = useRef(0);

  /**
   * AUTH CACHE INVALIDATION
   *
   * When user logs out, we must invalidate all permission/authorization query caches.
   * This prevents stale "isAdmin: true" data from being served on re-login.
   *
   * IMPORTANT: When creating new auth/permission hooks, add their query key here
   * using the centralized QUERY_KEYS from utilities/queryKeys.ts:
   * - useCheckCommunityAdmin → QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE
   * - useStaff → QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE
   * - useContractOwner → QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE
   */
  useEffect(() => {
    // Detect logout: was authenticated, now not authenticated
    if (prevAuthRef.current && !authenticated) {
      // Remove all permission/authorization queries on logout
      // Using removeQueries because:
      // - invalidateQueries triggers refetches → 401 errors
      // - resetQueries also triggers refetches for active queries
      // - removeQueries cleanly removes from cache without any refetch
      queryClient.removeQueries({ queryKey: QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE });

      // Reset auth failure counter on logout to avoid carrying over state to next login
      authFailureCount.current = 0;
    }
    prevAuthRef.current = authenticated;
  }, [authenticated]);

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

    // Check if privy-session cookie exists using proper cookie parsing.
    // If session exists, user might be in the middle of token refresh (HttpOnly cookies mode).
    const hasPrivySession = () => {
      if (typeof document === "undefined") return false;
      return document.cookie
        .split(";")
        .some((c) => c.trim().startsWith(`${PRIVY_SESSION_COOKIE_NAME}=`));
    };

    const checkAuthStatus = async () => {
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
      authFailureCount.current += 1;

      if (authFailureCount.current >= AUTH_FAILURE_THRESHOLD && authenticated) {
        authFailureCount.current = 0;
        logout?.();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      // For localStorage mode: detect cross-tab logout
      if (e.key === "privy:token" && !e.newValue) {
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
  };
};
