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
import { useAuth } from "@/hooks/useAuth";
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

function ConsumerA() {
  const { logout } = useAuth();
  firstConsumerLogout.current = logout;
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

const signedOut = () =>
  setBridge({ ready: true, authenticated: false, user: null, wallets: [], isConnected: false });

describe("logout — one event per session, whatever ended it", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
    __resetPendingLogoutReasonForTests();
    firstConsumerLogout.current = null;
    signedOut();
  });

  it("reports a user-initiated sign-out once, not once per consumer", async () => {
    signedIn();
    const { rerender } = render(<App />);

    await act(async () => {
      await firstConsumerLogout.current?.();
    });

    signedOut();
    await act(async () => {
      rerender(<App />);
    });

    expect(logoutEvents()).toEqual(["user"]);
  });

  it("reports a Privy user switch once, with the switch as the cause", async () => {
    signedIn("user-1");
    const { rerender } = render(<App />);

    // Both consumers see the id change and both decide to end the session.
    setBridge({ user: walletUser("user-2") });
    await act(async () => {
      rerender(<App />);
    });

    signedOut();
    await act(async () => {
      rerender(<App />);
    });

    expect(logoutEvents()).toEqual(["user_switch"]);
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
      act(() => {
        vi.runOnlyPendingTimers();
      });

      signedOut();
      act(() => {
        rerender(<App />);
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(logoutEvents()).toEqual(["wallet_disconnect"]);
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
      mockLogout.mockRejectedValue(new Error("privy unreachable"));
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
      mockLogout.mockResolvedValue(undefined);
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
    mockLogout.mockRejectedValue(new Error("privy unreachable"));
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
