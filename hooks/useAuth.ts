"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Hex } from "viem";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { useProjectCreateModalStore } from "@/store/modals/projectCreate";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";
import { getCypressMockAuthState } from "@/utilities/auth/cypress-auth";
import { TokenManager } from "@/utilities/auth/token-manager";
import { PAGES } from "@/utilities/pages";
import { queryClient } from "@/utilities/query-client";
import { useWhitelabel } from "@/utilities/whitelabel-context";

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
const POST_LOGIN_REDIRECT_KEY = "postLoginRedirect";

export const setPostLoginRedirect = (url: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, url);
};

const getPostLoginRedirect = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
};

const clearPostLoginRedirect = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
};

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
 * Clear wagmi's persisted localStorage state.
 * Wagmi persists wallet connection state (address, connector) to localStorage
 * with the "wagmi" prefix. Without clearing this on logout, the next login
 * will read stale wallet data from the previous user's session, causing
 * address mismatches between Privy (correct) and wagmi (stale).
 */
const clearWagmiState = () => {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("wagmi")) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore localStorage errors (e.g., private browsing, storage full)
  }
};

/**
 * Authentication hook that wraps Privy's built-in authentication.
 *
 * Reads from PrivyBridgeContext instead of calling usePrivy()/useWallets()/useAccount()
 * directly. This allows Privy/Wagmi SDK to be deferred via dynamic import — before
 * the SDK loads, the bridge returns safe defaults (ready=false, authenticated=false).
 */
export const useAuth = () => {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    getAccessToken,
    connectWallet,
    wallets,
    isConnected,
  } = usePrivyBridge();

  const router = useRouter();
  const pathname = usePathname();
  const { isWhitelabel } = useWhitelabel();

  const primaryWallet = wallets[0];
  // Track client-side hydration so getCypressMockAuthState() re-evaluates after SSR.
  // During SSR, window is undefined so the check returns null. Without isClient,
  // useMemo caches the SSR result when Privy's ready/authenticated haven't changed yet.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const cypressMockAuthState = useMemo(
    () => getCypressMockAuthState(),
    [ready, authenticated, isClient]
  );
  const isCypressMockAuthenticated = Boolean(cypressMockAuthState?.authenticated);
  const cypressMockAddress = cypressMockAuthState?.user?.wallet?.address as Hex | undefined;
  const address = (primaryWallet?.address as Hex | undefined) || cypressMockAddress;

  const shouldLoginAfterLogout = useRef(false);
  const prevAuthRef = useRef(authenticated);
  const prevUserIdRef = useRef<string | undefined>(user?.id);
  const authFailureCount = useRef(0);
  // Snapshot of wallet addresses captured at auth time (security: use ref, not live array)
  const walletsSnapshotRef = useRef<string[]>([]);

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
    // Detect login: was not authenticated, now authenticated
    if (!prevAuthRef.current && authenticated) {
      // Only redirect if we're on the default landing page.
      // In whitelabel mode, "/" is the community homepage (funding opportunities),
      // not a generic landing page — don't redirect away from it.
      // Skip redirect if create project modal is open (user triggered login from the modal)
      const isCreateModalOpen = useProjectCreateModalStore.getState().isProjectCreateModalOpen;
      if (pathname === "/" && !isWhitelabel && !isCreateModalOpen) {
        const redirectUrl = getPostLoginRedirect();
        if (redirectUrl) {
          router.push(redirectUrl);
          clearPostLoginRedirect();
        } else {
          router.push(PAGES.DASHBOARD);
        }
      }
    }

    // Detect logout: was authenticated, now not authenticated
    if (prevAuthRef.current && !authenticated) {
      queryClient.clear();
      TokenManager.clearCache();
      clearWagmiState();
      authFailureCount.current = 0;
      // Clear previous user ID so re-login with a different wallet
      // is not mistaken for a cross-tab user switch.
      prevUserIdRef.current = undefined;
    }

    // Detect user switch: different user.id while *continuously* authenticated.
    // This happens with Privy shared auth when a different user logs in
    // on another subdomain — Privy seamlessly transitions without logout.
    // Force logout to ensure full re-initialization with the new user's state.
    // Only triggers when prevAuthRef is true (no logout happened in between).
    if (
      prevAuthRef.current &&
      authenticated &&
      user?.id &&
      prevUserIdRef.current &&
      user.id !== prevUserIdRef.current
    ) {
      queryClient.clear();
      TokenManager.clearCache();
      clearWagmiState();
      logout();
    }

    prevAuthRef.current = authenticated;
    prevUserIdRef.current = user?.id;
  }, [authenticated, user?.id, logout]);

  // Snapshot wallet addresses at auth time for secure wallet-switch detection (P2-06)
  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      walletsSnapshotRef.current = wallets.map((w) => w.address.toLowerCase());
    } else if (!authenticated) {
      walletsSnapshotRef.current = [];
    }
  }, [authenticated, wallets]);

  // Initialize TokenManager with Privy inside useEffect
  useEffect(() => {
    if (ready) {
      TokenManager.setPrivyInstance({ getAccessToken });
    }
  }, [ready, getAccessToken]);

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
  // Dynamically imports @wagmi/core and privy-config to keep them out of the initial bundle
  //
  // Skip for social-login users (Farcaster, email, Google) who don't have an
  // external wallet linked. A stale wagmi connection from a previous wallet-based
  // session would falsely trigger logout for these users because the old wagmi
  // address isn't in the Farcaster user's linkedAccounts.
  const hasExternalWallet = useMemo(() => {
    if (!user?.linkedAccounts) return false;
    return user.linkedAccounts.some(
      (a) =>
        a.type === "wallet" && (a as { walletClientType?: string }).walletClientType !== "privy"
    );
  }, [user]);

  useEffect(() => {
    if (!ready || !authenticated || !hasExternalWallet) return;

    let unwatch: (() => void) | undefined;

    Promise.all([import("@wagmi/core"), import("@/utilities/wagmi/privy-config")]).then(
      ([{ watchAccount }, { privyConfig }]) => {
        unwatch = watchAccount(privyConfig, {
          onChange(account) {
            const newAddress = account.address?.toLowerCase();
            if (!newAddress) return;

            if (user && !compareAllWallets(user, newAddress)) {
              logout();
            }
          },
        });
      }
    );

    return () => unwatch?.();
  }, [ready, authenticated, hasExternalWallet, user, logout]);

  const adaptedLogin = useCallback(async () => {
    if (typeof window !== "undefined" && !authenticated) {
      const existingRedirect = getPostLoginRedirect();
      if (!existingRedirect) {
        setPostLoginRedirect(`${window.location.pathname}${window.location.hash}`);
      }
    }

    // If authenticated but wallet not connected via wagmi, force re-login only when
    // the user has external wallets (not embedded). Embedded wallets (from Privy)
    // may not register with wagmi, so treat wallets.length > 0 as effectively connected.
    if (
      !isConnected &&
      authenticated &&
      wallets.length > 0 &&
      !wallets.some((w) => w.walletClientType === "privy")
    ) {
      shouldLoginAfterLogout.current = true;
      await logout();
      return;
    }
    // Don't call Privy's login() when already authenticated (e.g. Farcaster users
    // with no wallet). Calling login() on an authenticated user triggers a
    // "already logged in" warning and does nothing useful.
    if (!authenticated) {
      login();
    }
  }, [isConnected, authenticated, wallets.length, logout, login]);

  const connectedAndAuth = useMemo(() => {
    if (isCypressMockAuthenticated) {
      return true;
    }
    // Privy authenticated is sufficient to be "logged in".
    // Some login methods (e.g., Farcaster) don't provide a browser-connectable wallet,
    // so requiring isConnected would incorrectly gate the logged-in status.
    return authenticated;
  }, [isCypressMockAuthenticated, authenticated]);

  const effectiveReady = isCypressMockAuthenticated ? true : ready;
  // Include embedded wallets in isConnected (Privy embedded wallets may not register with wagmi)
  const effectiveIsConnected = isCypressMockAuthenticated
    ? true
    : isConnected || wallets.length > 0;

  return {
    // Core authentication (Privy handles everything)
    authenticate: adaptedLogin, // Just use Privy's login
    disconnect: logout, // Just use Privy's logout

    // State from Privy
    ready: effectiveReady,
    authenticated: connectedAndAuth,
    isConnected: effectiveIsConnected,
    user,
    address,
    primaryWallet,
    wallets,

    // Privy methods
    login: adaptedLogin,
    logout,
    getAccessToken,
    connectWallet, // Connect wallet without full login

    // Compat shims for callers migrating from usePrivyAuth
    isAuthenticated: connectedAndAuth,
    isReady: effectiveReady,
  };
};
