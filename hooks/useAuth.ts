"use client";

import * as Sentry from "@sentry/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Hex } from "viem";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { useProjectCreateModalStore } from "@/store/modals/projectCreate";
import { emitLoginStarted } from "@/utilities/analytics/emitters/auth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";
import { watchCrossTabSession } from "@/utilities/auth/cross-tab-session";
import { E2E_MOCK_USER_ID, getE2EMockAuthState } from "@/utilities/auth/e2e-auth";
import { hasNonWalletIdentity } from "@/utilities/auth/has-non-wallet-identity";
import { hasPersistedPrivySession } from "@/utilities/auth/persisted-privy-session";
import { selectPrimaryWallet } from "@/utilities/auth/select-primary-wallet";
import {
  __resetUserSwitchGuardForTests,
  claimUserSwitchTeardown,
  clearPendingUserSwitch,
  createRunLogout,
  ignoreLogoutFailure,
  recordUserSwitch,
  runUserSwitchTeardown,
} from "@/utilities/auth/session-teardown";
import { TokenManager } from "@/utilities/auth/token-manager";
import { queryClient } from "@/utilities/query-client";
import { useWhitelabel } from "@/utilities/whitelabel-context";

// The connected address the auth-ready refetch barrier has already run for,
// shared across every useAuth instance (see the barrier effect below for why it
// must be module-level and not a per-hook ref). Client-only (only ever written
// inside a useEffect), so there is no SSR request bleed.
let authReadyBarrierAddress: Hex | undefined;

// Has the current disconnect already been acted on? useAuth has ~100+ call
// sites, so every mounted instance schedules its own timer — they must collapse
// to a single logout(). Deduplicating here, when the timer FIRES, rather than
// when it is scheduled, is what lets each instance keep ownership of (and clean
// up) its own timer while still yielding exactly one logout. Reset whenever the
// wallet state recovers. Client-only (only ever written inside an effect or its
// timer), so there is no SSR request bleed.
let walletDisconnectLogoutFired = false;

/** Re-exported so tests keep resetting the guard through the hook they drive. */
export { __resetUserSwitchGuardForTests };

/**
 * How long the wallet list must stay empty before a wallet-only session is
 * logged out. Privy can briefly report zero wallets while re-hydrating even
 * after `walletsReady` flips true; logging out on that transient blip is the
 * sign-out loop this delay exists to prevent.
 */
const WALLET_DISCONNECT_LOGOUT_DELAY_MS = 1000;

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
  const bridge = usePrivyBridge();
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
  } = bridge;

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
  // Privy produces no `user` under the bypass, so analytics had no distinct id
  // to identify and silenced every authenticated emission. Structurally a Privy
  // `User` for the fields anything reads off it (`id`, `wallet`); the cast is
  // confined to this seam and only reachable when the bypass is on.
  const effectiveUser = useMemo(
    () =>
      isE2EMockAuthenticated && !user
        ? ({ id: E2E_MOCK_USER_ID, wallet: { address: e2eMockAddress } } as unknown as typeof user)
        : user,
    [isE2EMockAuthenticated, user, e2eMockAddress]
  );
  const address = (primaryWallet?.address as Hex | undefined) || e2eMockAddress;
  // Does the session outlive losing every wallet? Derived as a boolean so the
  // disconnect effect below doesn't re-run on every new Privy `user` identity.
  const hasSurvivingIdentity = useMemo(() => hasNonWalletIdentity(user), [user]);

  const shouldLoginAfterLogout = useRef(false);
  const prevAuthRef = useRef(authenticated);
  const prevUserIdRef = useRef<string | undefined>(user?.id);
  /**
   * The identity as of the last render, readable from timers, intervals and
   * stable callbacks. Depending on the id directly in those would tear down and
   * reschedule the wallet-disconnect timer and the cross-tab interval every
   * time Privy hands back a new user object, which is exactly what they are
   * built not to do.
   */
  const currentUserIdRef = useRef<string | null>(user?.id ?? null);
  /**
   * The bridge itself, so the session can be read AFTER an `await` rather than
   * as whatever a render happened to capture.
   *
   * This is what tells a `logout()` that ended a session apart from one that
   * RESOLVED and ended nothing — Privy ignored the call, or the session was
   * already gone. The second kind records a cause that describes nothing, and
   * it has to be retracted rather than left to label whichever transition
   * happens next. Reading a destructured boolean out of a closure could not
   * answer that: it is the value from before the logout.
   */
  const bridgeRef = useRef(bridge);
  bridgeRef.current = bridge;
  /**
   * Bumped when a forced switch teardown ends nothing, purely to bring the
   * effect below back. Nothing about Privy's state changes when a teardown
   * fails, so without a dependency that does, the retry would never run.
   */
  const [userSwitchAttempt, setUserSwitchAttempt] = useState(0);
  const authFailureCount = useRef(0);
  // Snapshot of wallet addresses captured at auth time (security: use ref, not live array)
  const walletsSnapshotRef = useRef<string[]>([]);
  // Grace period after login — suppresses watchAccount false positives from stale wagmi state
  const loginGraceRef = useRef(false);
  // Tracks the wallet address across renders to detect the undefined→defined
  // transition once Privy/Wagmi finish hydrating after auth (see refetch barrier).
  const prevAddressRef = useRef<Hex | undefined>(address);

  const runLogout = useMemo(
    () => createRunLogout(logout, () => bridgeRef.current.authenticated),
    [logout]
  );

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
      // The teardown landed (or the session ended some other way), so there is
      // nothing left to retry.
      clearPendingUserSwitch();
    }

    // Detect user switch: a different user.id while *continuously* authenticated.
    // Privy shared auth transitions seamlessly when someone signs in on another
    // subdomain, so the handed-over session has to be torn down for the app to
    // re-initialise with the new user's state. `session-teardown.ts` holds the
    // guard that keeps ~100 mounted instances to one teardown, and explains why
    // detection is separate from the attempt.
    if (
      prevAuthRef.current &&
      authenticated &&
      user?.id &&
      prevUserIdRef.current &&
      user.id !== prevUserIdRef.current &&
      recordUserSwitch(prevUserIdRef.current, user.id)
    ) {
      // Once per switch, not once per attempt: a retry is tearing down the
      // same session, and these are already clear.
      queryClient.clear();
      TokenManager.clearCache();
      clearWagmiState();
    }

    const activeSwitch = authenticated ? claimUserSwitchTeardown(user?.id) : null;
    if (activeSwitch) {
      // Re-running this effect is the only way a retry can happen — no Privy
      // state changed, so nothing else would bring it back.
      runUserSwitchTeardown(activeSwitch, runLogout, () =>
        setUserSwitchAttempt((attempt) => attempt + 1)
      );
    }

    prevAuthRef.current = authenticated;
    prevUserIdRef.current = user?.id;
  }, [authenticated, user?.id, runLogout, userSwitchAttempt]);

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
      // Reconnected, or never applicable — re-arm for a future disconnect. Any
      // timers still pending are cleared by their own instance's cleanup when
      // this effect re-runs.
      walletDisconnectLogoutFired = false;
      return;
    }

    // Every mounted instance schedules its own timer and cleans up its own
    // timer. That is deliberate: a shared timer owned by one instance would be
    // cancelled when that instance unmounts, and no other instance would
    // reschedule — stranding the session authenticated forever. The
    // module-level flag collapses the resulting N timers into one logout.
    const timer = setTimeout(() => {
      if (walletDisconnectLogoutFired) return;
      walletDisconnectLogoutFired = true;
      void runLogout("wallet_disconnect", currentUserIdRef.current).catch(ignoreLogoutFailure);
    }, WALLET_DISCONNECT_LOGOUT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [ready, walletsReady, authenticated, wallets.length, hasSurvivingIdentity, runLogout]);

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  // Auto-login after logout completes
  useEffect(() => {
    if (shouldLoginAfterLogout.current && !authenticated && ready) {
      shouldLoginAfterLogout.current = false;
      login();
    }
  }, [authenticated, ready, login]);

  // Cross-tab logout synchronization. The watcher itself lives in
  // `cross-tab-session.ts`; the failure counter is a ref here so it survives
  // the effect's re-runs and can be reset by the logout path above.
  useEffect(() => {
    if (!ready || !authenticated) return;
    return watchCrossTabSession({
      failureCount: authFailureCount,
      onSessionGone: () =>
        void runLogout("cross_tab", currentUserIdRef.current).catch(ignoreLogoutFailure),
    });
  }, [ready, authenticated, runLogout]);

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

    Promise.all([import("@wagmi/core"), import("@/utilities/wagmi/privy-config")])
      .then(([{ watchAccount }, { privyConfig }]) => {
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
              // A different wallet at the browser level is a different identity,
              // which is the same session boundary as Privy's own user switch.
              void runLogout("user_switch", user.id).catch(ignoreLogoutFailure);
            }
          },
        });
      })
      .catch((error) => {
        if (cancelled) return;
        // The wagmi chunk failed to load, or `watchAccount` rejected the config
        // it was handed. Nothing user-facing has broken, but wallet-switch
        // detection is now OFF for this session — a different wallet at the
        // browser level will no longer end the session — so it is reported
        // rather than swallowed.
        //
        // Un-caught, this rejected into the void: it does not fail a render, so
        // it surfaced as an unhandled rejection that failed whichever unrelated
        // test happened to be running when it landed.
        Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
          tags: { hook: "useAuth", operation: "watch_account_setup" },
        });
      });

    return () => {
      cancelled = true;
      unwatch?.();
    };
  }, [ready, authenticated, hasExternalWallet, user, runLogout]);

  // Whether an authenticated session has to be torn down and re-established
  // because wagmi lost the external wallet (see the branch that uses it below).
  const needsWalletReconnect =
    !isConnected &&
    authenticated &&
    wallets.length > 0 &&
    !wallets.some((w) => w.walletClientType === "privy");

  /**
   * Opens the sign-in flow.
   *
   * `entryPoint` names the surface the user clicked from (`"navbar"`,
   * `"project_page_cta"`); see `emitters/auth.ts` for how it is resolved.
   */
  const adaptedLogin = useCallback(
    async (entryPoint?: unknown) => {
      // Both branches below end in Privy's login() — the reconnect one by way
      // of the auto-login effect — so the funnel opens here rather than at
      // either call site. Calling adaptedLogin on an already-signed-in user is
      // a no-op and must not open a funnel it will never close.
      //
      // Before Privy resolves, `authenticated` is false for everyone, so it
      // alone cannot tell a signed-out visitor from a signed-in one whose
      // session has not hydrated yet. The persisted token settles it: for an
      // anonymous visitor the SDK is deliberately deferred (idle callback, up
      // to 5s, or this very click — see `PrivyProviderWrapper`), so the click
      // that OPENS the funnel almost always lands while `ready` is false. A
      // plain `ready` gate therefore dropped nearly every start while the
      // matching `login_completed` — emitted once the SDK is up — still fired,
      // which is why production showed completions against ~zero starts.
      //
      // With no persisted token there is no session to hydrate and the visitor
      // is certainly signed out, so the start is real. With a token present we
      // still say nothing: that session may be about to restore, and a start
      // reported for it would open a funnel nothing closes.
      //
      // The two branches are told apart for the emitter: before the SDK loads
      // the bridge's `login` is a noop and nothing replays the click, so the
      // visitor sees nothing happen and clicks again once Privy is ready. That
      // is one funnel opening reached by two clicks, and `emitLoginStarted`
      // drops the second.
      if (ready && (!authenticated || needsWalletReconnect)) {
        emitLoginStarted(entryPoint, pathname);
      } else if (!ready && !hasPersistedPrivySession()) {
        emitLoginStarted(entryPoint, pathname, { beforePrivyReady: true });
      }

      if (typeof window !== "undefined" && !authenticated) {
        const existingRedirect = getPostLoginRedirect();
        if (!existingRedirect) {
          setPostLoginRedirect(`${window.location.pathname}${window.location.hash}`);
        }
      }

      // If authenticated but wallet not connected via wagmi, force re-login only when
      // the user has external wallets (not embedded). Embedded wallets (from Privy)
      // may not register with wagmi, so treat wallets.length > 0 as effectively connected.
      if (needsWalletReconnect) {
        shouldLoginAfterLogout.current = true;
        // Not the user signing out: the session is torn down so wagmi can
        // re-attach the external wallet, and the auto-login effect signs them
        // straight back in.
        await runLogout("wallet_reconnect", currentUserIdRef.current);
        return;
      }
      // Don't call Privy's login() when already authenticated (e.g. Farcaster users
      // with no wallet). Calling login() on an authenticated user triggers a
      // "already logged in" warning and does nothing useful.
      if (!authenticated) {
        login();
      }
    },
    [ready, authenticated, needsWalletReconnect, pathname, runLogout, login]
  );

  /**
   * The logout handed to product code. Every *internal* logout above records
   * its own reason; anything a component calls is the user asking to sign out.
   * The event itself is emitted once, by `AnalyticsProvider`.
   */
  const trackedLogout = useCallback(() => runLogout("user", currentUserIdRef.current), [runLogout]);

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
    disconnect: trackedLogout,

    // State from Privy
    ready: effectiveReady,
    authenticated: connectedAndAuth,
    isConnected: effectiveIsConnected,
    user: effectiveUser,
    address,
    primaryWallet,
    wallets,
    walletsReady,

    // Privy methods
    login: adaptedLogin,
    logout: trackedLogout,
    getAccessToken,
    connectWallet, // Connect wallet without full login

    // Compat shims for callers migrating from usePrivyAuth
    isAuthenticated: connectedAndAuth,
    isReady: effectiveReady,
  };
};
