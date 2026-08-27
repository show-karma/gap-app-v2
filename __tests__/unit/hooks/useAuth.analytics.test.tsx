/**
 * @file Tests for the `login_started` / `logout` events useAuth emits.
 *
 * The point of interest is *which* logout fired: the hook ends a session for
 * four different reasons and the activation/retention reports only make sense
 * if a wallet extension disconnecting is distinguishable from a user clicking
 * Log out. Each reason is driven through its real trigger rather than by
 * calling a helper directly.
 */

import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/utilities/analytics/client";

// Undo the global mock of useAuth so we exercise the real hook
vi.unmock("@/hooks/useAuth");

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const mockPathname = vi.fn(() => "/funding-map");

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: () => mockPathname(),
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

const loggedReasons = () =>
  vi
    .mocked(track)
    .mock.calls.filter(([name]) => name === "logout")
    .map(([, props]) => (props as { reason: string }).reason);

describe("useAuth analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/funding-map");
    resetBridge();
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
      mockPathname.mockReturnValue("/project/0xabc/updates");
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login();
      });

      expect(track).toHaveBeenCalledWith("login_started", { entry_point: "project" });
    });

    it("ignores the click event a bare onClick handler would pass", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({ type: "click" } as unknown as string);
      });

      expect(track).toHaveBeenCalledWith("login_started", { entry_point: "funding-map" });
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
      expect(loggedReasons()).toEqual([]);
    });
  });

  describe("logout", () => {
    it("reports a user-initiated sign-out", async () => {
      setBridge({ authenticated: true, user: walletUser("user-1"), wallets: [WALLET] });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(track).toHaveBeenCalledWith("logout", { reason: "user" });
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it("reports the same reason through the disconnect alias", async () => {
      setBridge({ authenticated: true, user: walletUser("user-1"), wallets: [WALLET] });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(track).toHaveBeenCalledWith("logout", { reason: "user" });
    });

    it("reports a Privy shared-auth user switch", async () => {
      setBridge({ authenticated: true, user: walletUser("user-1"), wallets: [WALLET] });
      const { rerender } = renderHook(() => useAuth());

      setBridge({ user: walletUser("user-2") });
      await act(async () => {
        rerender();
      });

      expect(loggedReasons()).toContain("user_switch");
    });

    it("reports a wallet disconnect once the grace period elapses", async () => {
      vi.useFakeTimers();
      try {
        setBridge({ authenticated: true, user: walletUser("user-1"), wallets: [WALLET] });
        const { rerender } = renderHook(() => useAuth());

        setBridge({ wallets: [] });
        act(() => {
          rerender();
        });

        expect(loggedReasons()).not.toContain("wallet_disconnect");

        act(() => {
          vi.runOnlyPendingTimers();
        });

        expect(loggedReasons()).toContain("wallet_disconnect");
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
