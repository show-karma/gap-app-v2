/**
 * @file The `logout` event, end to end: the real `useAuth` guards deciding, the
 * real `AnalyticsProvider` reporting.
 *
 * This is the seam the unit tests on either side cannot cover. `useAuth` mounts
 * at ~100 call sites, so a real page has dozens of instances of it running the
 * same session-ending guards against one Privy bridge. A hook test with a single
 * consumer cannot see them race, and a provider test with no consumers at all
 * cannot see what they recorded — which is how a design that emitted one event
 * per mounted instance passed both.
 *
 * So: one bridge, two consumers, one provider, and the assertion is always a
 * count as well as a reason.
 */

import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { AnalyticsProvider } from "@/components/Utilities/AnalyticsProvider";
import { __resetUserSwitchGuardForTests, useAuth } from "@/hooks/useAuth";
import { __resetPendingLogoutReasonForTests } from "@/utilities/analytics/auth-transitions";
import { track } from "@/utilities/analytics/client";

// The global test setup stubs useAuth; this file is about the real one.
vi.unmock("@/hooks/useAuth");

vi.mock("@/utilities/analytics/client", () => ({
  identifyUser: vi.fn(),
  registerSuperProperties: vi.fn(),
  resetIdentity: vi.fn(),
  setCommunityGroup: vi.fn(),
  track: vi.fn(),
  trackPageView: vi.fn(),
  unregisterSuperProperty: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: () => "/funding-map",
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: vi.fn(() => ({ isWhitelabel: false, communitySlug: null })),
}));

vi.mock("@/store/modals/projectCreate", () => ({
  useProjectCreateModalStore: {
    getState: vi.fn(() => ({ isProjectCreateModalOpen: false })),
  },
}));

vi.mock("@/utilities/pages", () => ({ PAGES: { DASHBOARD: "/dashboard" } }));

const mockLogin = vi.fn();
const mockLogout = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

const mockBridgeState = {
  ready: true,
  authenticated: false,
  user: null as User | null,
  login: mockLogin,
  logout: mockLogout,
  getAccessToken: vi.fn(),
  connectWallet: vi.fn(),
  wallets: [] as ConnectedWallet[],
  walletsReady: true,
  isConnected: false,
};

/**
 * One bridge object, mutated in place — which is what makes this harness able to
 * model the case that matters.
 *
 * `useAuth` judges whether a `logout()` actually ended a session by reading the
 * bridge AFTER the promise resolves. A `logout()` that signs out mutates this
 * object as part of resolving, so that read sees the truth without waiting for
 * React; a `logout()` that ends nothing leaves it alone, and the attempt
 * retracts its own cause. Tests drive renders explicitly with `rerender`.
 */
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => mockBridgeState,
  PrivyBridgeContext: { Provider: ({ children }: { children: ReactNode }) => children },
  PRIVY_BRIDGE_DEFAULTS: {},
}));

vi.mock("@wagmi/core", () => ({ watchAccount: vi.fn(() => vi.fn()) }));
vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: vi.fn(() => ({})),
}));
vi.mock("@/utilities/query-client", () => ({
  queryClient: { clear: vi.fn(), invalidateQueries: vi.fn() },
}));
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn().mockResolvedValue(null),
    setPrivyInstance: vi.fn(),
    clearTokens: vi.fn(),
    clearCache: vi.fn(),
  },
}));

const WALLET = {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  walletClientType: "metamask",
} as unknown as ConnectedWallet;

const walletUser = (id: string) =>
  ({ id, linkedAccounts: [{ type: "wallet", address: WALLET.address }] }) as unknown as User;

const setBridge = (overrides: Partial<typeof mockBridgeState>) =>
  Object.assign(mockBridgeState, overrides);

/**
 * Two consumers, because one is the case that was already passing. Each holds a
 * live `useAuth`, so every session-ending guard in the hook is running twice
 * against the same bridge state — which is what a real page looks like.
 */
const firstConsumerLogout = { current: null as null | (() => Promise<unknown>) };
const firstConsumerLogin = {
  current: null as null | ((entryPoint?: string) => Promise<unknown> | unknown),
};

function ConsumerA() {
  const { logout, login } = useAuth();
  firstConsumerLogout.current = logout;
  firstConsumerLogin.current = login as never;
  return null;
}

function ConsumerB() {
  useAuth();
  return null;
}

function App() {
  return (
    <>
      <AnalyticsProvider />
      <ConsumerA />
      <ConsumerB />
    </>
  );
}

const logoutEvents = () =>
  vi
    .mocked(track)
    .mock.calls.filter(([name]) => name === "logout")
    .map(([, props]) => (props as { reason: string }).reason);

const signedIn = (id = "user-1") =>
  setBridge({
    ready: true,
    authenticated: true,
    user: walletUser(id),
    wallets: [WALLET],
    walletsReady: true,
    isConnected: true,
  });

/** One step of fake time, comfortably inside the pending cause's own expiry. */
const AUTH_CHECK_STEP_MS = 5000;
/** Enough steps to cover the guard's initial delay plus several check intervals. */
const AUTH_CHECK_MAX_STEPS = 120;

/**
 * Runs fake time forward until the guard has actually ended the session, then
 * renders once so the provider sees the transition.
 *
 * In small steps, and stopping as soon as the session is gone: a single long
 * jump ages the recorded cause past its expiry before anything can consume it,
 * which is the harness outrunning the app rather than a defect in it.
 */
const advanceUntilSignedOut = async (rerender: (ui: ReactNode) => void) => {
  for (let step = 0; step < AUTH_CHECK_MAX_STEPS; step++) {
    if (!mockBridgeState.authenticated) break;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_CHECK_STEP_MS);
    });
  }
  await act(async () => {
    rerender(<App />);
  });
};

const signedOut = () =>
  setBridge({ ready: true, authenticated: false, user: null, wallets: [], isConnected: false });

/**
 * A `logout()` that really signs out, which is what Privy does: the promise
 * resolves and the session is gone. The bridge is flipped here rather than by
 * each test, because the ORDER matters — `useAuth` judges whether an attempt
 * ended anything by looking at the session shortly after the promise settles.
 */
const logoutEndsTheSession = () =>
  mockLogout.mockImplementation(async () => {
    signedOut();
  });

/** A `logout()` that comes back cleanly and leaves the session standing. */
const logoutEndsNothing = () => mockLogout.mockResolvedValue(undefined);

/** A `logout()` that fails outright. */
const logoutRejects = () => mockLogout.mockRejectedValue(new Error("privy unreachable"));

/**
 * A `logout()` that throws where it is CALLED rather than returning a rejected
 * promise. A different code path from `logoutRejects` — the throw happens before
 * any `await` — and the one most likely to escape handling.
 */
const logoutThrowsSynchronously = () =>
  mockLogout.mockImplementation(() => {
    throw new Error("privy exploded");
  });

/**
 * Lets the grace period in `useAuth` elapse, which is when a resolved attempt
 * that ended nothing retracts its own cause. Requires fake timers.
 */
const settleLogoutJudgement = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(LOGOUT_GRACE_SPAN_MS);
  });
};

/** Comfortably past `LOGOUT_TRANSITION_GRACE_MS` in `useAuth`. */
const LOGOUT_GRACE_SPAN_MS = 2000;

describe("logout — one event per session, whatever ended it", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logoutEndsTheSession();
    __resetPendingLogoutReasonForTests();
    __resetUserSwitchGuardForTests();
    firstConsumerLogout.current = null;
    firstConsumerLogin.current = null;
    signedOut();
  });

  it("reports a user-initiated sign-out once, not once per consumer", async () => {
    signedIn();
    const { rerender } = render(<App />);

    await act(async () => {
      await firstConsumerLogout.current?.();
    });
    await act(async () => {
      rerender(<App />);
    });

    expect(logoutEvents()).toEqual(["user"]);
  });

  it("reports both halves of a Privy user switch as the switch", async () => {
    // Privy swaps `user` without ever passing through an unauthenticated state,
    // and the guard immediately tears the arriving session down so the app can
    // re-initialise. Two sessions end: user-1's, at the moment of the swap, and
    // user-2's momentary one.
    //
    // Both are the SAME event to a reader. The teardown is an app artifact, not
    // somebody signing out, so reporting the second as "user" would invent a
    // sign-out user-2 never performed.
    signedIn("user-1");
    const { rerender } = render(<App />);

    setBridge({ user: walletUser("user-2") });
    await act(async () => {
      rerender(<App />);
    });
    await act(async () => {
      rerender(<App />);
    });

    expect(logoutEvents()).toEqual(["user_switch", "user_switch"]);
  });

  it("does not let the switch label an unrelated sign-out that follows it", async () => {
    // The second `user_switch` is consumed by the teardown it describes, so a
    // later genuine sign-out is the user's own.
    signedIn("user-1");
    const { rerender } = render(<App />);

    setBridge({ user: walletUser("user-2") });
    await act(async () => {
      rerender(<App />);
    });
    await act(async () => {
      rerender(<App />);
    });

    signedIn("user-3");
    await act(async () => {
      rerender(<App />);
    });
    await act(async () => {
      await firstConsumerLogout.current?.();
    });
    await act(async () => {
      rerender(<App />);
    });

    expect(logoutEvents()).toEqual(["user_switch", "user_switch", "user"]);
  });

  describe("when the switch teardown does not happen", () => {
    /**
     * Privy has already moved A aside by the time any of this runs, so A's exit
     * is real however the teardown goes. B's is the contingent half: if the
     * forced logout does not land, B is left authenticated with its caches
     * already cleared, and the app needs a way to try again rather than sitting
     * in that state with a `user_switch` queued for a teardown that never was.
     */
    const driveSwitch = async (rerender: (ui: ReactNode) => void) => {
      setBridge({ user: walletUser("user-2") });
      await act(async () => {
        rerender(<App />);
      });
    };

    it("still reports A's departure when the teardown rejects", async () => {
      signedIn("user-1");
      logoutRejects();
      const { rerender } = render(<App />);

      await driveSwitch(rerender);

      expect(logoutEvents()).toEqual(["user_switch"]);
    });

    it("still reports A's departure when the teardown throws synchronously", async () => {
      signedIn("user-1");
      logoutThrowsSynchronously();
      const { rerender } = render(<App />);

      await driveSwitch(rerender);

      expect(logoutEvents()).toEqual(["user_switch"]);
    });

    it("leaves B signed in, and invents no sign-out, when every attempt fails", async () => {
      // The state this is all about: B is authenticated with A's caches already
      // cleared. Nothing invents a sign-out for B on the way there.
      signedIn("user-1");
      logoutRejects();
      const { rerender } = render(<App />);

      await driveSwitch(rerender);

      expect(mockBridgeState.authenticated).toBe(true);
      expect(logoutEvents()).toEqual(["user_switch"]);
    });

    it("tries again when the first teardown fails, and ends B on the retry", async () => {
      // Nothing about Privy's state changes when a teardown fails, so the retry
      // is the only thing that gets B out of that state.
      signedIn("user-1");
      mockLogout
        .mockRejectedValueOnce(new Error("privy unreachable"))
        .mockImplementation(async () => {
          signedOut();
        });
      const { rerender } = render(<App />);

      await driveSwitch(rerender);
      await act(async () => {
        rerender(<App />);
      });

      expect(mockLogout).toHaveBeenCalledTimes(2);
      expect(mockBridgeState.authenticated).toBe(false);
      expect(logoutEvents()).toEqual(["user_switch", "user_switch"]);
    });

    it("gives up after the second failure rather than retrying forever", async () => {
      // If Privy refuses twice it will keep refusing, and an unbounded retry
      // turns one bad switch into a loop calling logout() for ever.
      signedIn("user-1");
      logoutRejects();
      const { rerender } = render(<App />);

      await driveSwitch(rerender);
      for (let settle = 0; settle < 3; settle += 1) {
        await act(async () => {
          rerender(<App />);
        });
      }

      expect(mockLogout).toHaveBeenCalledTimes(2);
    });

    it("does not report a second switch that never happened", async () => {
      // The successor is cancelled, so B's eventual real exit is B's own — and
      // A's `user_switch` is not duplicated onto it.
      signedIn("user-1");
      logoutRejects();
      const { rerender } = render(<App />);

      await driveSwitch(rerender);

      logoutEndsTheSession();
      await act(async () => {
        await firstConsumerLogout.current?.();
      });
      await act(async () => {
        rerender(<App />);
      });

      expect(logoutEvents()).toEqual(["user_switch", "user"]);
    });

    it("does not leave B's cause queued for someone else's sign-out", async () => {
      // The teardown resolves and ends nothing, so the successor it queued
      // describes an event that did not happen. A genuine sign-out later is the
      // user's own.
      vi.useFakeTimers();
      try {
        signedIn("user-1");
        logoutEndsNothing();
        const { rerender } = render(<App />);

        setBridge({ user: walletUser("user-2") });
        await act(async () => {
          rerender(<App />);
        });
        // Once per attempt: the first settle retires attempt one and releases
        // the retry, the second retires that. Only when both are done is the
        // successor guaranteed cancelled rather than merely pending.
        await settleLogoutJudgement();
        await settleLogoutJudgement();

        expect(logoutEvents()).toEqual(["user_switch"]);

        // B signs out by hand, much later.
        logoutEndsTheSession();
        await act(async () => {
          await firstConsumerLogout.current?.();
        });
        await act(async () => {
          rerender(<App />);
        });

        expect(logoutEvents()).toEqual(["user_switch", "user"]);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it("reports a wallet disconnect once, after both consumers' timers fire", async () => {
    vi.useFakeTimers();
    try {
      signedIn();
      const { rerender } = render(<App />);

      setBridge({ wallets: [] });
      act(() => {
        rerender(<App />);
      });

      // Each consumer scheduled its own grace timer; the module-level flag
      // collapses them into one logout call, and the provider into one event.
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      await act(async () => {
        rerender(<App />);
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(logoutEvents()).toEqual(["wallet_disconnect"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports a cross-tab sign-out once, with the cross-tab cause", async () => {
    // Both consumers run the same auth-check interval against the same bridge,
    // so both reach the failure threshold and both decide to end the session.
    vi.useFakeTimers();
    try {
      signedIn();
      const { rerender } = render(<App />);

      // Every check finds no token and no session; after the threshold the
      // guard gives up on the session.
      //
      // Advanced in small steps rather than one long jump, because fake timers
      // move `Date.now()` too: a single ten-minute jump would age the recorded
      // cause past its own expiry before the render that consumes it, which is
      // an artefact of the harness rather than anything the app does.
      await advanceUntilSignedOut(rerender);

      expect(logoutEvents()).toEqual(["cross_tab"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports a wallet reconnect once, and not as the user signing out", async () => {
    // wagmi lost the external wallet, so the session is torn down for it to be
    // re-attached and the auto-login effect signs the user straight back in.
    // That is machinery, not somebody leaving.
    setBridge({
      ready: true,
      authenticated: true,
      user: walletUser("user-1"),
      wallets: [WALLET],
      walletsReady: true,
      isConnected: false,
    });
    const { rerender } = render(<App />);

    await act(async () => {
      await firstConsumerLogin.current?.("navbar");
    });
    await act(async () => {
      rerender(<App />);
    });

    expect(logoutEvents()).toEqual(["wallet_reconnect"]);
  });

  it("does not label a later transition with a cause whose logout resolved but ended nothing", async () => {
    // The nastiest of the three: `logout()` came back cleanly and the session is
    // still standing. There is no error to notice, so the cause it recorded
    // would sit there looking valid until something unrelated consumed it.
    vi.useFakeTimers();
    try {
      signedIn();
      // Privy accepts the call and does nothing — already signed out elsewhere,
      // or the call is a no-op for this session.
      logoutEndsNothing();
      const { rerender } = render(<App />);

      setBridge({ wallets: [] });
      act(() => {
        rerender(<App />);
      });
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      await settleLogoutJudgement();

      // Still authenticated: nothing ended, and the attempt has now retracted
      // its own cause rather than waiting out the record's ten-second expiry.
      expect(logoutEvents()).toEqual([]);

      // The wallet comes back, so the disconnect guard stands down, and then
      // Privy drops the session on its own with no guard involved. That exit
      // must not inherit the cause of an attempt that ended nothing.
      logoutEndsTheSession();
      setBridge({ wallets: [WALLET] });
      act(() => {
        rerender(<App />);
      });
      signedOut();
      act(() => {
        rerender(<App />);
      });

      expect(logoutEvents()).toEqual(["user"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not label a later session end with a cause whose logout was rejected", async () => {
    // The teardown failed, so the session survived and the cause it recorded
    // describes nothing. Later Privy expires the session on its own — no guard
    // runs, nothing records a reason — and that must report as a plain sign-out
    // rather than inheriting the stale wallet-disconnect.
    vi.useFakeTimers();
    try {
      signedIn();
      logoutRejects();
      const { rerender } = render(<App />);

      setBridge({ wallets: [] });
      act(() => {
        rerender(<App />);
      });
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      // Still authenticated: nothing ended.
      expect(logoutEvents()).toEqual([]);

      // The wallet comes back, so the disconnect guard stands down.
      logoutEndsTheSession();
      setBridge({ wallets: [WALLET] });
      act(() => {
        rerender(<App />);
      });

      // Privy drops the session itself. No guard decided this one.
      signedOut();
      act(() => {
        rerender(<App />);
      });

      expect(logoutEvents()).toEqual(["user"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports nothing when a logout attempt leaves the session standing", async () => {
    signedIn();
    logoutRejects();
    const { rerender } = render(<App />);

    await act(async () => {
      await firstConsumerLogout.current?.().catch(() => undefined);
    });

    // Privy never flipped `authenticated`, so there is no transition to report.
    await act(async () => {
      rerender(<App />);
    });

    expect(logoutEvents()).toEqual([]);
  });

  it("reports nothing for a visitor who was never signed in", async () => {
    signedOut();
    const { rerender } = render(<App />);

    await act(async () => {
      rerender(<App />);
    });

    expect(logoutEvents()).toEqual([]);
  });
});
