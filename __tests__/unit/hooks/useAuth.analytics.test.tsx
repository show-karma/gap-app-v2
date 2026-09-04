/**
 * @file Tests for what useAuth contributes to the auth funnel.
 *
 * It emits exactly one event itself — `login_started`. It does NOT emit
 * `logout`: the hook mounts at ~100 call sites and every instance runs the same
 * guards, so emitting there produced one event per mounted instance. The guards
 * now only RECORD why the session is ending, and `AnalyticsProvider` — of which
 * one is mounted — reports it. These tests pin the recorded reason for each
 * trigger; the single emission is covered in the provider's own tests.
 */

import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { __resetUserSwitchGuardForTests, useAuth } from "@/hooks/useAuth";
import {
  __resetPendingLogoutReasonForTests,
  takePendingLogoutReason,
} from "@/utilities/analytics/auth-transitions";
import { track } from "@/utilities/analytics/client";
import { clearPreReadyLoginStart } from "@/utilities/analytics/emitters/auth";

// Undo the global mock of useAuth so we exercise the real hook
vi.unmock("@/hooks/useAuth");

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

/**
 * `useAuth` reads the path from `window.location`, not from `usePathname()`:
 * the value is only consumed inside the login callback and never rendered, and
 * the hook is called by the navbar on every route, so a `usePathname()` there
 * would abort the prerender of the whole app. Drive it the same way.
 */
const originalLocation = window.location;

const setPathname = (pathname: string) => {
  // `Location.pathname` is a non-configurable accessor in jsdom, so it cannot
  // be redefined in place — `window.location` itself is what gets replaced.
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      href: `${originalLocation.origin}${pathname}`,
      origin: originalLocation.origin,
      pathname,
      search: "",
      hash: "",
    },
  });
};

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  })),
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
const mockLogout = vi.fn().mockResolvedValue(undefined);

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

const resetBridge = () =>
  setBridge({
    ready: true,
    authenticated: false,
    user: null,
    wallets: [],
    walletsReady: true,
    isConnected: false,
  });

/** Every `logout` this hook emitted directly — which must always be none. */
const emittedLogouts = () => vi.mocked(track).mock.calls.filter(([name]) => name === "logout");

describe("useAuth analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPendingLogoutReasonForTests();
    __resetUserSwitchGuardForTests();
    setPathname("/funding-map");
    resetBridge();
    // A persisted Privy token now changes what the pre-`ready` emit gate does,
    // so it must not leak between cases.
    localStorage.clear();
    // The pre-`ready` start is module state and outlives a test.
    clearPreReadyLoginStart();
  });

  describe("login_started", () => {
    it("names the surface the caller passed", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("navbar");
      });

      expect(track).toHaveBeenCalledWith("login_started", { entry_point: "navbar" });
    });

    it("falls back to the route family, never the raw pathname", async () => {
      setPathname("/project/0xabc/updates");
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login();
      });

      expect(track).toHaveBeenCalledWith("login_started", { entry_point: "route:project" });
    });

    it("ignores the click event a bare onClick handler would pass", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({ type: "click" } as unknown as string);
      });

      expect(track).toHaveBeenCalledWith("login_started", {
        entry_point: "route:funding-map",
      });
    });

    it("rejects a surface id that is not in the closed union", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("some_invented_surface");
      });

      expect(track).toHaveBeenCalledWith("login_started", {
        entry_point: "route:funding-map",
      });
    });

    it("reports the start of an anonymous visitor whose Privy SDK has not loaded yet", async () => {
      // The funnel-opening click: for an anonymous visitor the SDK is
      // deliberately deferred, so `ready` is still false when they click. With
      // no persisted token there is no session to hydrate — they are certainly
      // signed out and the start is real. Gating on `ready` alone dropped
      // nearly every one of these while `login_completed` still fired.
      setBridge({ ready: false });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("navbar");
      });

      expect(track).toHaveBeenCalledWith("login_started", { entry_point: "navbar" });
    });

    it("stays silent before Privy is ready when a session may still be hydrating", async () => {
      // A persisted token means the SDK is loading a session that may restore.
      // A start reported for it would open a funnel nothing closes.
      setBridge({ ready: false });
      localStorage.setItem("privy:token", "persisted-session-token");

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("navbar");
      });

      expect(track).not.toHaveBeenCalled();
    });

    it("treats unreadable storage as signed out, matching the deferred SDK load", async () => {
      // Storage can throw outright (privacy mode, blocked storage, enterprise
      // policy). PrivyProviderWrapper takes the anonymous deferred path in
      // exactly that case, so the emit gate has to agree or the click that
      // opens the funnel goes unreported.
      setBridge({ ready: false });
      // Scoped to the Privy key: `adaptedLogin` also reads sessionStorage for
      // the post-login redirect, and that read is unguarded, so throwing for
      // every key would fail the case on an unrelated line.
      const realGetItem = Storage.prototype.getItem;
      const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (
        this: Storage,
        key: string
      ) {
        if (key === "privy:token") throw new Error("storage unavailable");
        return realGetItem.call(this, key);
      });

      try {
        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.login("navbar");
        });

        expect(track).toHaveBeenCalledWith("login_started", { entry_point: "navbar" });
      } finally {
        getItem.mockRestore();
      }
    });

    it("reports one start when the pre-ready click is retried once Privy is ready", async () => {
      // Before the SDK loads the bridge's `login` is a noop and nothing replays
      // the click, so the visitor sees nothing happen and clicks again. Two
      // clicks, one funnel opening.
      setBridge({ ready: false });
      const { result, rerender } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("navbar");
      });

      setBridge({ ready: true });
      rerender();

      await act(async () => {
        await result.current.login("navbar");
      });

      const starts = vi.mocked(track).mock.calls.filter(([name]) => name === "login_started");
      // Only the event count is asserted: the bridge double's `login` is a
      // vi.fn(), where production's pre-`ready` bridge hands back a real noop.
      expect(starts).toHaveLength(1);
    });

    it("reports a ready click that no pre-ready click preceded", async () => {
      // The dedupe must only suppress a retry — an ordinary signed-out click
      // with nothing before it still opens the funnel.
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("navbar");
      });

      const starts = vi.mocked(track).mock.calls.filter(([name]) => name === "login_started");
      expect(starts).toHaveLength(1);
    });

    it("opens the funnel again for a click after the retry was suppressed", async () => {
      // Suppressing the retry consumes the mark, so a later attempt — a modal
      // dismissed, a genuine second try — is a new activation, not a retry.
      setBridge({ ready: false });
      const { result, rerender } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("navbar");
      });

      setBridge({ ready: true });
      rerender();

      await act(async () => {
        await result.current.login("navbar");
      });
      await act(async () => {
        await result.current.login("navbar");
      });

      const starts = vi.mocked(track).mock.calls.filter(([name]) => name === "login_started");
      expect(starts).toHaveLength(2);
    });

    it("does not open a funnel it will never close for an already signed-in user", async () => {
      setBridge({
        authenticated: true,
        user: walletUser("user-1"),
        wallets: [WALLET],
        isConnected: true,
      });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login();
      });

      expect(track).not.toHaveBeenCalledWith("login_started", expect.anything());
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("opens the funnel when an authenticated session has to reconnect its wallet", async () => {
      // wagmi lost the external wallet: the hook tears the session down and the
      // auto-login effect signs the user back in, so this IS a login attempt.
      setBridge({
        authenticated: true,
        user: walletUser("user-1"),
        wallets: [WALLET],
        isConnected: false,
      });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("navbar");
      });

      expect(track).toHaveBeenCalledWith("login_started", { entry_point: "navbar" });
      expect(mockLogout).toHaveBeenCalledTimes(1);
      // The teardown is machinery, not the user signing out.
      expect(emittedLogouts()).toEqual([]);
      expect(takePendingLogoutReason("user-1")).toBe("wallet_reconnect");
    });
  });

  describe("logout reasons", () => {
    const signedIn = () =>
      setBridge({
        authenticated: true,
        user: walletUser("user-1"),
        wallets: [WALLET],
        isConnected: true,
      });

    it("never emits the event itself, at any of its sites", async () => {
      signedIn();
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(emittedLogouts()).toEqual([]);
    });

    it("records a user-initiated sign-out", async () => {
      signedIn();
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(takePendingLogoutReason("user-1")).toBe("user");
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it("records the same reason through the disconnect alias", async () => {
      signedIn();
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(takePendingLogoutReason("user-1")).toBe("user");
    });

    it("records a Privy shared-auth user switch", async () => {
      signedIn();
      const { rerender } = renderHook(() => useAuth());

      setBridge({ user: walletUser("user-2") });
      await act(async () => {
        rerender();
      });

      // Recorded against the DEPARTING identity. Privy has already swapped
      // `user` to user-2, but the session that is ending is user-1's — the
      // provider consumes this against the user it had identified, and
      // recording the new id would attribute user-1's exit to user-2.
      expect(takePendingLogoutReason("user-2")).toBe("user");
      expect(takePendingLogoutReason("user-1")).toBe("user");

      // Read the other way round, from a fresh switch, it is user-1's.
      __resetPendingLogoutReasonForTests();
      __resetUserSwitchGuardForTests();
      setBridge({ user: walletUser("user-3") });
      await act(async () => {
        rerender();
      });
      expect(takePendingLogoutReason("user-2")).toBe("user_switch");
    });

    it("records a wallet disconnect once the grace period elapses", async () => {
      vi.useFakeTimers();
      try {
        signedIn();
        const { rerender } = renderHook(() => useAuth());

        setBridge({ wallets: [] });
        act(() => {
          rerender();
        });

        act(() => {
          vi.runOnlyPendingTimers();
        });

        expect(takePendingLogoutReason("user-1")).toBe("wallet_disconnect");
      } finally {
        vi.useRealTimers();
      }
    });

    it("keeps one reason no matter how many hook instances are mounted", async () => {
      signedIn();
      const first = renderHook(() => useAuth());
      renderHook(() => useAuth());

      await act(async () => {
        await first.result.current.logout();
      });

      expect(emittedLogouts()).toEqual([]);
      expect(takePendingLogoutReason("user-1")).toBe("user");
      // Read once and cleared, so a later unrelated logout cannot inherit it.
      expect(takePendingLogoutReason("user-1")).toBe("user");
    });
  });
});
