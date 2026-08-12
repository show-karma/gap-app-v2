/**
 * @file Tests for useAuth's wallet-disconnect logout
 * @description Disconnecting the site from inside the wallet extension empties
 * Privy's wallet list but leaves the session authenticated. For a wallet-only
 * session that is a dead end — no address to render, no Sign-in button (still
 * "logged in"), and the Log out item lives inside a menu that can no longer
 * render. useAuth ends such a session; these tests pin the guards that keep it
 * from becoming a sign-out loop.
 */

import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

// Undo the global mock of useAuth so we exercise the real hook
vi.unmock("@/hooks/useAuth");

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: vi.fn(() => ({ isWhitelabel: false, whitelabelConfig: null })),
}));

vi.mock("@/store/modals/projectCreate", () => ({
  useProjectCreateModalStore: {
    getState: vi.fn(() => ({ isProjectCreateModalOpen: false })),
  },
}));

vi.mock("@/utilities/pages", () => ({ PAGES: { DASHBOARD: "/dashboard" } }));

const mockLogout = vi.fn().mockResolvedValue(undefined);

const mockBridgeState = {
  ready: true,
  authenticated: true,
  user: null as User | null,
  login: vi.fn(),
  logout: mockLogout,
  getAccessToken: vi.fn(),
  connectWallet: vi.fn(),
  wallets: [] as ConnectedWallet[],
  walletsReady: true,
  isConnected: true,
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
    getToken: vi.fn(),
    setPrivyInstance: vi.fn(),
    clearTokens: vi.fn(),
    clearCache: vi.fn(),
  },
}));

const WALLET = {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  walletClientType: "metamask",
} as unknown as ConnectedWallet;

const walletOnlyUser = {
  id: "user-1",
  linkedAccounts: [{ type: "wallet", address: WALLET.address }],
} as unknown as User;

const emailUser = {
  id: "user-2",
  email: { address: "a@b.com" },
  linkedAccounts: [
    { type: "email", address: "a@b.com" },
    { type: "wallet", address: WALLET.address },
  ],
} as unknown as User;

const setBridge = (overrides: Partial<typeof mockBridgeState>) =>
  Object.assign(mockBridgeState, overrides);

/**
 * Render useAuth in the CONNECTED state first, then disconnect — the real
 * sequence. Starting connected also clears any logout the previous test left
 * pending on the module-level shared timer.
 */
function renderConnectedThenDisconnect(
  user: User,
  overrides: Partial<typeof mockBridgeState> = {}
) {
  setBridge({ user, wallets: [WALLET], walletsReady: true, authenticated: true });
  const view = renderHook(() => useAuth());
  setBridge({ wallets: [], ...overrides });
  act(() => {
    view.rerender();
  });
  return view;
}

describe("useAuth — wallet-disconnect logout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLogout.mockClear();
  });

  afterEach(() => {
    // The shared disconnect timer is module-level and intentionally survives
    // unmount, so drain it here or a logout scheduled by one test could fire
    // inside the next one. mockLogout is cleared in beforeEach.
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it("logs out a wallet-only session after the wallet is disconnected", () => {
    renderConnectedThenDisconnect(walletOnlyUser);

    // Not immediate — a transient empty list must not sign anyone out.
    expect(mockLogout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("logs out exactly once when many useAuth instances are mounted", () => {
    // useAuth has ~100+ call sites. A per-instance timer would let every
    // mounted instance schedule and fire its own logout() for one disconnect.
    setBridge({
      user: walletOnlyUser,
      wallets: [WALLET],
      walletsReady: true,
      authenticated: true,
    });
    const views = [
      renderHook(() => useAuth()),
      renderHook(() => useAuth()),
      renderHook(() => useAuth()),
    ];
    setBridge({ wallets: [] });
    act(() => {
      for (const view of views) view.rerender();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("still logs out when the instance that scheduled the logout unmounts", () => {
    // The pending logout belongs to the disconnected session, not to whichever
    // component happened to schedule it — unmounting does not reconnect the
    // wallet. If teardown cancelled the shared timer, every other instance has
    // already returned at the guard and would never schedule a replacement,
    // stranding the session authenticated forever.
    setBridge({
      user: walletOnlyUser,
      wallets: [WALLET],
      walletsReady: true,
      authenticated: true,
    });
    const scheduler = renderHook(() => useAuth());
    const survivor = renderHook(() => useAuth());
    setBridge({ wallets: [] });
    act(() => {
      scheduler.rerender();
      survivor.rerender();
    });

    act(() => {
      scheduler.unmount();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("keeps an email user signed in when they disconnect a linked wallet", () => {
    renderConnectedThenDisconnect(emailUser);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("does not log out while Privy is still hydrating wallets", () => {
    // walletsReady=false is the legitimate "wallets are empty because we haven't
    // loaded them yet" state — logging out here is the sign-out loop.
    renderConnectedThenDisconnect(walletOnlyUser, { walletsReady: false });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("cancels the pending logout if a wallet reconnects within the delay", () => {
    const view = renderConnectedThenDisconnect(walletOnlyUser);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    setBridge({ wallets: [WALLET] });
    act(() => {
      view.rerender();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("does not log out an unauthenticated visitor who has no wallet", () => {
    setBridge({ user: null, wallets: [], walletsReady: true, authenticated: false });
    renderHook(() => useAuth());

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });
});
