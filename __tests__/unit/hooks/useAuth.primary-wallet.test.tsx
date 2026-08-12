/**
 * @file Tests for useAuth primary-wallet resolution
 * @description Verifies useAuth derives identity from the wallet linked to the
 * authenticated user (via selectPrimaryWallet), not from a stale, still-connected
 * wallet such as a lingering MetaMask. Kept separate from useAuth.test.tsx to avoid
 * growing that (already oversized) file.
 */

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";

// Undo the global mock of useAuth from __tests__/navbar/setup.ts
// so we can test the real hook implementation
vi.unmock("@/hooks/useAuth");

// Mock next/navigation so useRouter() and usePathname() don't throw
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

// Mock useWhitelabel which is called inside useAuth
vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: vi.fn(() => ({
    isWhitelabel: false,
    whitelabelConfig: null,
  })),
}));

// Mock store used in login redirect logic
vi.mock("@/store/modals/projectCreate", () => ({
  useProjectCreateModalStore: {
    getState: vi.fn(() => ({ isProjectCreateModalOpen: false })),
  },
}));

// Mock compareAllWallets — overridden per-test to model which wallets are linked.
// getLinkedWalletAddresses stays real: selectPrimaryWallet uses it to decide
// whether the user has any linked wallets at all (the undefined-vs-fallback rule).
vi.mock("@/utilities/auth/compare-all-wallets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utilities/auth/compare-all-wallets")>();
  return {
    ...actual,
    compareAllWallets: vi.fn(() => true),
  };
});

// Mock PAGES constants
vi.mock("@/utilities/pages", () => ({
  PAGES: {
    DASHBOARD: "/dashboard",
  },
}));

const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockGetAccessToken = vi.fn();
const mockGetToken = vi.fn();

// Mock the bridge context that useAuth reads from
const mockBridgeState = {
  ready: true,
  authenticated: false,
  user: null as any,
  login: mockLogin,
  logout: mockLogout,
  getAccessToken: mockGetAccessToken,
  connectWallet: vi.fn(),
  wallets: [] as any[],
  isConnected: false,
};

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => mockBridgeState,
  PrivyBridgeContext: {
    Provider: ({ children }: { children: any }) => children,
  },
  PRIVY_BRIDGE_DEFAULTS: {
    ready: false,
    authenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: async () => null,
    connectWallet: vi.fn(),
    wallets: [],
    isConnected: false,
  },
}));

// Mock @wagmi/core for the dynamic import in the watchAccount effect
vi.mock("@wagmi/core", () => ({
  watchAccount: vi.fn(() => vi.fn()),
}));

// Mock privy-config for the dynamic import in the watchAccount effect
vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: vi.fn(() => ({})),
}));

const mockQueryClientClear = vi.fn();
const mockClearCache = vi.fn();

vi.mock("@/utilities/query-client", () => ({
  queryClient: {
    clear: (...args: unknown[]) => mockQueryClientClear(...args),
    invalidateQueries: vi.fn(),
  },
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: (...args: unknown[]) => mockGetToken(...args),
    setPrivyInstance: vi.fn(),
    clearTokens: vi.fn(),
    clearCache: (...args: unknown[]) => mockClearCache(...args),
  },
}));

/** Helper to update mockBridgeState in place */
function setBridgeState(overrides: Partial<typeof mockBridgeState>) {
  Object.assign(mockBridgeState, overrides);
}

/** Reset bridge state to defaults */
function resetBridgeState() {
  Object.assign(mockBridgeState, {
    ready: true,
    authenticated: false,
    user: null,
    login: mockLogin,
    logout: mockLogout,
    getAccessToken: mockGetAccessToken,
    connectWallet: vi.fn(),
    wallets: [],
    isConnected: false,
  });
}

describe("useAuth - stale connected wallet after switching login method", () => {
  /**
   * Regression: login with MetaMask, log out, then log in with email.
   *
   * MetaMask cannot be disconnected programmatically (Privy's wallet.disconnect()
   * is a no-op for it), so it stays connected and remains in useWallets() — often
   * as wallets[0] — even though it is NOT linked to the new email user. The address
   * exposed by useAuth() (used for the avatar and on-chain lookups) must resolve to
   * the email user's own (embedded) wallet, never the leftover MetaMask wallet.
   */
  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  const mockCompareAllWallets = vi.mocked(compareAllWallets);

  const STALE_METAMASK_ADDRESS = "0xMETAMASK00000000000000000000000000000001";
  const EMAIL_EMBEDDED_ADDRESS = "0xEMBEDDED00000000000000000000000000000002";

  const emailUser = {
    id: "email-user-1",
    email: { address: "user@example.com" },
    wallet: { address: EMAIL_EMBEDDED_ADDRESS },
    linkedAccounts: [
      { type: "email", address: "user@example.com" },
      { type: "wallet", address: EMAIL_EMBEDDED_ADDRESS, walletClientType: "privy" },
    ],
  };

  // Stale MetaMask wallet is listed first by Privy (connected earlier), embedded second.
  const staleMetaMaskWallet = {
    address: STALE_METAMASK_ADDRESS,
    chainId: "eip155:10",
    walletClientType: "metamask",
  };
  const embeddedWallet = {
    address: EMAIL_EMBEDDED_ADDRESS,
    chainId: "eip155:10",
    walletClientType: "privy",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Realistic behavior: only the embedded wallet is linked to the email user.
    mockCompareAllWallets.mockImplementation(
      (_user, address) => address.toLowerCase() === EMAIL_EMBEDDED_ADDRESS.toLowerCase()
    );
    setBridgeState({
      ready: true,
      authenticated: true,
      user: emailUser,
      wallets: [staleMetaMaskWallet, embeddedWallet],
      isConnected: true,
    });
  });

  afterEach(() => {
    resetBridgeState();
    // Restore the default global mock implementation for other suites.
    mockCompareAllWallets.mockImplementation(() => true);
  });

  it("resolves the address to the linked embedded wallet, not the stale MetaMask wallet", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.address).toBe(EMAIL_EMBEDDED_ADDRESS);
    expect(result.current.address).not.toBe(STALE_METAMASK_ADDRESS);
    expect(result.current.primaryWallet?.address).toBe(EMAIL_EMBEDDED_ADDRESS);
  });

  it("withholds the address when the user has linked wallets but only a foreign one is connected", () => {
    // The email user HAS a linked wallet, but the sole connected wallet is the
    // stale MetaMask that belongs to a previous session. Identity must NOT leak
    // the foreign address — it resolves to undefined until the linked wallet
    // connects (issue #1574).
    mockCompareAllWallets.mockImplementation(() => false);
    setBridgeState({ wallets: [staleMetaMaskWallet] });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.address).toBeUndefined();
    expect(result.current.address).not.toBe(STALE_METAMASK_ADDRESS);
  });

  it("falls back to the first connected wallet during true hydration (no linked wallets yet)", () => {
    // linkedAccounts genuinely not populated yet — keep a wallet rather than
    // flipping to undefined, preserving wallet-login connect flows.
    mockCompareAllWallets.mockImplementation(() => false);
    setBridgeState({
      user: { ...emailUser, linkedAccounts: [{ type: "email", address: "user@example.com" }] },
      wallets: [staleMetaMaskWallet],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.address).toBe(STALE_METAMASK_ADDRESS);
  });

  it("keeps the active wallet (wallets[0]) when an account has multiple linked wallets", () => {
    const secondLinkedAddress = "0xLINKED0000000000000000000000000000000003";
    // Both connected wallets belong to the user — selection must not reorder them.
    mockCompareAllWallets.mockImplementation((_user, address) =>
      [EMAIL_EMBEDDED_ADDRESS, secondLinkedAddress].some(
        (a) => a.toLowerCase() === address.toLowerCase()
      )
    );
    setBridgeState({
      wallets: [
        { address: secondLinkedAddress, chainId: "eip155:10", walletClientType: "rainbow" },
        embeddedWallet,
      ],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.address).toBe(secondLinkedAddress);
  });
});
