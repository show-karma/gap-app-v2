/**
 * @file Tests for the useAuth auth-ready refetch barrier
 * @description Privy/Wagmi hydrate the wallet asynchronously, so `authenticated`
 * flips true before `wallets[0].address` is populated. useAuth invalidates
 * queries once when the address first resolves so requests that ran during the
 * gap (empty/401) refetch with auth now ready. Kept in a focused module to keep
 * useAuth.test.tsx under the file-size budget.
 */

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

// Undo the global mock of useAuth from __tests__/navbar/setup.ts
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

vi.mock("@/utilities/auth/compare-all-wallets", () => ({
  compareAllWallets: vi.fn(() => true),
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: { DASHBOARD: "/dashboard" },
}));

vi.mock("@wagmi/core", () => ({
  watchAccount: vi.fn(() => vi.fn()),
}));

const mockQueryClientInvalidate = vi.fn();

vi.mock("@/utilities/query-client", () => ({
  queryClient: {
    clear: vi.fn(),
    invalidateQueries: (...args: unknown[]) => mockQueryClientInvalidate(...args),
  },
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn().mockResolvedValue("token"),
    setPrivyInstance: vi.fn(),
    clearCache: vi.fn(),
  },
}));

// Mutable bridge state that useAuth reads from. Typed loosely (not as Privy's
// full User/ConnectedWallet) so tests can set minimal fixtures without `any`.
interface MockBridgeState {
  ready: boolean;
  authenticated: boolean;
  user: { id?: string; wallet?: { address: string } } | null;
  login: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  connectWallet: () => void;
  wallets: Array<{ address: string; chainId?: string }>;
  isConnected: boolean;
}

const mockBridgeState: MockBridgeState = {
  ready: true,
  authenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn().mockResolvedValue("token"),
  connectWallet: vi.fn(),
  wallets: [],
  isConnected: false,
};

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => mockBridgeState,
}));

function setBridgeState(overrides: Partial<typeof mockBridgeState>) {
  Object.assign(mockBridgeState, overrides);
}

function resetBridgeState() {
  Object.assign(mockBridgeState, {
    ready: true,
    authenticated: false,
    user: null,
    wallets: [],
    isConnected: false,
  });
}

describe("useAuth - auth-ready refetch barrier", () => {
  const mockPrivyUser = {
    id: "user-123",
    wallet: { address: "0x1234567890123456789012345678901234567890" },
  };
  const mockWallet = {
    address: "0x1234567890123456789012345678901234567890",
    chainId: "eip155:10",
  };
  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  beforeEach(() => {
    mockQueryClientInvalidate.mockClear();
  });

  afterEach(() => {
    resetBridgeState();
  });

  it("invalidates queries when the wallet address resolves after auth (Privy↔Wagmi gap)", async () => {
    // Authenticated, but wallets[0].address has not hydrated yet.
    setBridgeState({
      ready: true,
      authenticated: true,
      user: mockPrivyUser,
      wallets: [],
      isConnected: false,
    });
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    expect(mockQueryClientInvalidate).not.toHaveBeenCalled();

    // Wallet hydrates → address becomes available.
    setBridgeState({ wallets: [mockWallet], isConnected: true });
    await act(async () => {
      rerender();
    });

    expect(mockQueryClientInvalidate).toHaveBeenCalledTimes(1);
  });

  it("does not invalidate when the address is already present at mount", async () => {
    setBridgeState({
      ready: true,
      authenticated: true,
      user: mockPrivyUser,
      wallets: [mockWallet],
      isConnected: true,
    });
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      rerender();
    });

    expect(mockQueryClientInvalidate).not.toHaveBeenCalled();
  });

  it("invalidates only ONCE when many useAuth instances observe the same address hydrate", async () => {
    // useAuth has ~100+ call sites; each runs the barrier effect. A module-level
    // guard must ensure only one instance invalidates per address, or every
    // mounted instance fires a full invalidation in the same commit — GAP A11.
    const addr = "0xaaaa000000000000000000000000000000000001";
    setBridgeState({ ready: true, authenticated: true, user: mockPrivyUser, wallets: [] });

    const instances = [
      renderHook(() => useAuth(), { wrapper }),
      renderHook(() => useAuth(), { wrapper }),
      renderHook(() => useAuth(), { wrapper }),
    ];
    expect(mockQueryClientInvalidate).not.toHaveBeenCalled();

    setBridgeState({ wallets: [{ address: addr, chainId: "eip155:10" }], isConnected: true });
    await act(async () => {
      for (const i of instances) i.rerender();
    });

    expect(mockQueryClientInvalidate).toHaveBeenCalledTimes(1);
  });

  it("does not re-invalidate when the address flickers undefined→defined repeatedly", async () => {
    // The wagmi address blips undefined↔defined during the sync. Each reappearance
    // must not re-invalidate once the barrier has already run for that address.
    const addr = "0xbbbb000000000000000000000000000000000002";
    const wallet = { address: addr, chainId: "eip155:10" };
    setBridgeState({ ready: true, authenticated: true, user: mockPrivyUser, wallets: [] });
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // First hydrate → one invalidation.
    setBridgeState({ wallets: [wallet], isConnected: true });
    await act(async () => rerender());
    expect(mockQueryClientInvalidate).toHaveBeenCalledTimes(1);

    // Flicker back to no address, then to the same address again — no new fire.
    for (let i = 0; i < 5; i++) {
      setBridgeState({ wallets: [], isConnected: false });
      await act(async () => rerender());
      setBridgeState({ wallets: [wallet], isConnected: true });
      await act(async () => rerender());
    }
    expect(mockQueryClientInvalidate).toHaveBeenCalledTimes(1);
  });
});
