"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Hex } from "viem";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { useProjectCreateModalStore } from "@/store/modals/projectCreate";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";
import { getE2EMockAuthState } from "@/utilities/auth/e2e-auth";
import { hasNonWalletIdentity } from "@/utilities/auth/has-non-wallet-identity";
import { selectPrimaryWallet } from "@/utilities/auth/select-primary-wallet";
import { TokenManager } from "@/utilities/auth/token-manager";
import { queryClient } from "@/utilities/query-client";
import { useWhitelabel } from "@/utilities/whitelabel-context";

// The connected address the auth-ready refetch barrier has already run for,
// shared across every useAuth instance (see the barrier effect below for why it
// must be module-level and not a per-hook ref). Client-only (only ever written
// inside a useEffect), so there is no SSR request bleed.
let authReadyBarrierAddress: Hex | undefined;

// The single pending wallet-disconnect logout, shared across every mounted
// useAuth instance. It must be module-level, not a per-hook ref: useAuth has
// ~100+ call sites, so a per-hook timer would let every mounted instance
// schedule and fire its own logout() for the same disconnect. Client-only
// (only ever written inside a useEffect), so there is no SSR request bleed.
let walletDisconnectLogoutTimer: ReturnType<typeof setTimeout> | null = null;

const clearWalletDisconnectLogout = () => {
  if (walletDisconnectLogoutTimer !== null) {
    clearTimeout(walletDisconnectLogoutTimer);
    walletDisconnectLogoutTimer = null;
  }
};

/**
 * How long the wallet list must stay empty before a wallet-only session is
 * logged out. Privy can briefly report zero wallets while re-hydrating even
 * after `walletsReady` flips true; logging out on that transient blip is the
 * sign-out loop this delay exists to prevent.
 */
const WALLET_DISCONNECT_LOGOUT_DELAY_MS = 1000;

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
    // SUPPRESSED: clearing stale wagmi keys is best-effort housekeeping.
    // localStorage throws in private browsing and when the quota is full;
    // neither is actionable here, and failing would block logout.
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
    walletsReady,
    isConnected,
  } = usePrivyBridge();

  const router = useRouter();
  const pathname = usePathname();
  const { isWhitelabel } = useWhitelabel();

  // Resolve the wallet representing the authenticated user's identity. See
  // selectPrimaryWallet for why wallets[0] is not safe (stale, unlinked wallets such
  // as MetaMask can linger in useWallets() across login methods). Shared with
  // PrivyWagmiProviders so useAuth().address and useAccount() agree.
  const primaryWallet = useMemo(() => selectPrimaryWallet(user, wallets), [user, wallets]);
  // Track client-side hydration so getE2EMockAuthState() re-evaluates after SSR.
  // During SSR, window is undefined so the check returns null. Without isClient,
  // useMemo caches the SSR result when Privy's ready/authenticated haven't changed yet.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const e2eMockAuthState = useMemo(() => getE2EMockAuthState(), [ready, authenticated, isClient]);
  const isE2EMockAuthenticated = Boolean(e2eMockAuthState?.authenticated);
  const e2eMockAddress = e2eMockAuthState?.user?.wallet?.address as Hex | undefined;
  const address = (primaryWallet?.address as Hex | undefined) || e2eMockAddress;
  // Does the session outlive losing every wallet? Derived as a boolean so the
  // disconnect effect below doesn't re-run on every new Privy `user` identity.
  const hasSurvivingIdentity = useMemo(() => hasNonWalletIdentity(user), [user]);

  const shouldLoginAfterLogout = useRef(false);
  // Marks the instance that scheduled the shared wallet-disconnect logout timer.
  const ownsDisconnectLogoutRef = useRef(false);
  const prevAuthRef = useRef(authenticated);
  const prevUserIdRef = useRef<string | undefined>(user?.id);
  const authFailureCount = useRef(0);
  // Snapshot of wallet addresses captured at auth time (security: use ref, not live array)
  const walletsSnapshotRef = useRef<string[]>([]);
  // Grace period after login — suppresses watchAccount false positives from stale wagmi state
  const loginGraceRef = useRef(false);
  // Tracks the wallet address across renders to detect the undefined→defined
  // transition once Privy/Wagmi finish hydrating after auth (see refetch barrier).
  const prevAddressRef = useRef<Hex | undefined>(address);

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
      // Suppress watchAccount checks briefly — wagmi state may be stale
      // from the previous session during the Privy↔wagmi sync gap.
      loginGraceRef.current = true;
      setTimeout(() => {
        loginGraceRef.current = false;
      }, 2000);

      // After login, redirect to a saved post-login URL if one exists,
      // but only if we're on the homepage (not a deep link the user navigated to).
      // In whitelabel mode, "/" is the community homepage — don't redirect.
      // Skip redirect if create project modal is open (user triggered login from the modal).
      const isCreateModalOpen = useProjectCreateModalStore.getState().isProjectCreateModalOpen;
      if (pathname === "/" && !isWhitelabel && !isCreateModalOpen) {
        const redirectUrl = getPostLoginRedirect();
        if (redirectUrl) {
          router.push(redirectUrl);
          clearPostLoginRedirect();
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

  /**
   * AUTH-READY REFETCH BARRIER
   *
   * Privy/Wagmi hydrate the wallet asynchronously: `authenticated` flips true
   * before `wallets[0].address` is populated (the deferred-SDK race). Any
   * authenticated query that fired during that window had no token/address and
   * resolved empty or 401'd. fetchData swallows the 401 into a null tuple, so
   * React Query treats it as data and never refetches — the stale empty result
   * sticks until a manual page refresh. When the address first becomes
   * available, invalidate queries once so they refetch with auth now ready.
   */
  useEffect(() => {
    const prev = prevAddressRef.current;
    prevAddressRef.current = address;
    // Fire once when the address hydrates after auth (the undefined→defined gap).
    // Two guards, both required:
    //  - `!prev && address`: only the absent→present transition, per instance —
    //    so an address already present at mount doesn't invalidate.
    //  - module-level `authReadyBarrierAddress`: useAuth has ~100+ call sites, each
    //    running this effect; without a SHARED guard every mounted instance would
    //    invalidate ALL queries in the same commit — N simultaneous full
    //    invalidations, i.e. a refetch storm (GAP A11). The shared value lets only
    //    the first instance fire per distinct connected address.
    if (authenticated && !prev && address && authReadyBarrierAddress !== address) {
      authReadyBarrierAddress = address;
      queryClient.invalidateQueries();
    }
  }, [authenticated, address]);

  /**
   * WALLET-DISCONNECT LOGOUT
   *
   * Disconnecting the site inside the wallet extension (MetaMask ▸ Connected
   * sites ▸ Disconnect) empties Privy's wallet list but leaves the Privy session
   * authenticated. For a wallet-only session that is a dead end: `address` goes
   * undefined, so the navbar has no address, no avatar and no name to render,
   * while `authenticated` stays true so the Sign-in button never comes back —
   * and the Log out item lives inside the menu that can no longer render. The
   * user is locked out until they clear site data.
   *
   * The session is also functionally useless: every authenticated write is keyed
   * on the signer that just went away. So end it — this mirrors the existing
   * wallet-*switch* logout above, which already treats a change of wallet
   * identity as the end of the session.
   *
   * Three guards keep this from becoming the sign-out loop CLAUDE.md warns
   * about:
   *  - `walletsReady`: `wallets` is legitimately empty while Privy hydrates.
   *  - `hasNonWalletIdentity`: an email/Google/Farcaster user who merely linked
   *    a wallet keeps their session when they disconnect it.
   *  - the delay + cleanup: a transient empty list cancels the pending logout
   *    instead of signing the user out.
   */
  useEffect(() => {
    if (!ready || !walletsReady || !authenticated) return;
    if (wallets.length > 0 || hasSurvivingIdentity) {
      // Reconnected, or never applicable — cancel any logout still pending.
      clearWalletDisconnectLogout();
      return;
    }
    // Another mounted instance already scheduled this disconnect's logout.
    if (walletDisconnectLogoutTimer !== null) return;

    ownsDisconnectLogoutRef.current = true;
    walletDisconnectLogoutTimer = setTimeout(() => {
      walletDisconnectLogoutTimer = null;
      logout();
    }, WALLET_DISCONNECT_LOGOUT_DELAY_MS);

    // Only the instance that scheduled the timer may cancel it on teardown —
    // otherwise an unrelated instance unmounting would silently drop the logout.
    return () => {
      if (ownsDisconnectLogoutRef.current) {
        ownsDisconnectLogoutRef.current = false;
        clearWalletDisconnectLogout();
      }
    };
  }, [ready, walletsReady, authenticated, wallets.length, hasSurvivingIdentity, logout]);

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
        // SUPPRESSED: not swallowed — a failed token check (network error, etc.)
        // is deliberately routed into the consecutive-failure counter below, so
        // a transient hiccup can't log the user out on its own.
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
    let cancelled = false;

    Promise.all([import("@wagmi/core"), import("@/utilities/wagmi/privy-config")]).then(
      ([{ watchAccount }, { privyConfig }]) => {
        if (cancelled) return;
        unwatch = watchAccount(privyConfig, {
          onChange(account) {
            if (cancelled) return;
            // Skip during login grace period — wagmi state may be stale
            // from the previous session during the Privy↔wagmi sync gap.
            if (loginGraceRef.current) return;

            const newAddress = account.address?.toLowerCase();
            if (!newAddress) return;

            if (user && !compareAllWallets(user, newAddress)) {
              logout();
            }
          },
        });
      }
    );

    return () => {
      cancelled = true;
      unwatch?.();
    };
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
    if (isE2EMockAuthenticated) {
      return true;
    }
    // Privy authenticated is sufficient to be "logged in".
    // Some login methods (e.g., Farcaster) don't provide a browser-connectable wallet,
    // so requiring isConnected would incorrectly gate the logged-in status.
    return authenticated;
  }, [isE2EMockAuthenticated, authenticated]);

  const effectiveReady = isE2EMockAuthenticated ? true : ready;
  // Include embedded wallets in isConnected (Privy embedded wallets may not register with wagmi)
  const effectiveIsConnected = isE2EMockAuthenticated ? true : isConnected || wallets.length > 0;

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
    walletsReady,

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
