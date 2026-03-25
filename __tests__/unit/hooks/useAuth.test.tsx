/**
 * @file Tests for useAuth hook
 * @description Tests cache invalidation on logout using centralized QUERY_KEYS
 * and cross-tab logout synchronization with failure threshold
 */

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { QUERY_KEYS } from "@/utilities/queryKeys";

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
vi.mock("@/hooks/useWhitelabel", () => ({
  useWhitelabel: vi.fn(() => ({
    isWhitelabel: false,
    whitelabelConfig: null,
  })),
}));

// Controllable mock functions for hook tests
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

// Mock @wagmi/core for dynamic import in watchAccount effect
vi.mock("@wagmi/core", () => ({
  watchAccount: vi.fn(() => vi.fn()),
}));

import { watchAccount as _watchAccount } from "@wagmi/core";

const mockWatchAccount = vi.mocked(_watchAccount);

// Mock privy-config for dynamic import in watchAccount effect
vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: vi.fn(() => ({})),
}));

const mockQueryClientClear = vi.fn();
const mockClearCache = vi.fn();

vi.mock("@/utilities/query-client", () => ({
  queryClient: {
    clear: (...args: unknown[]) => mockQueryClientClear(...args),
    removeQueries: vi.fn(),
  },
}));

// Mock TokenManager module-level to ensure next/jest resolves the same mock instance
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

describe("useAuth - Query Key Consistency", () => {
  describe("QUERY_KEYS structure for cache invalidation", () => {
    it("should have AUTH.CONTRACT_OWNER_BASE key defined", () => {
      expect(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE).toBeDefined();
      expect(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE).toEqual(["contract-owner"]);
    });

    it("should have AUTH.PERMISSIONS_BASE key defined", () => {
      expect(QUERY_KEYS.AUTH.PERMISSIONS_BASE).toBeDefined();
      expect(QUERY_KEYS.AUTH.PERMISSIONS_BASE).toEqual(["permissions"]);
    });

    it("should have COMMUNITY.IS_ADMIN_BASE key defined", () => {
      expect(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE).toBeDefined();
      expect(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE).toEqual(["isCommunityAdmin"]);
    });

    it("should have full key factories that start with base keys", () => {
      // Full keys should be prefixed with base keys for removeQueries to work
      const fullAdminKey = QUERY_KEYS.COMMUNITY.IS_ADMIN("uid", 1, "addr", {});
      const fullOwnerKey = QUERY_KEYS.AUTH.CONTRACT_OWNER("addr", 1);

      expect(fullAdminKey[0]).toBe(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE[0]);
      expect(fullOwnerKey[0]).toBe(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE[0]);
    });

    it("should have all necessary query key factories for auth hooks", () => {
      // Verify all auth-related keys exist
      expect(typeof QUERY_KEYS.AUTH.CONTRACT_OWNER).toBe("function");
      expect(typeof QUERY_KEYS.COMMUNITY.IS_ADMIN).toBe("function");
    });
  });

  describe("Query key format validation", () => {
    it("should return arrays for all query keys", () => {
      expect(Array.isArray(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE)).toBe(true);
      expect(Array.isArray(QUERY_KEYS.AUTH.PERMISSIONS_BASE)).toBe(true);
      expect(Array.isArray(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE)).toBe(true);

      expect(Array.isArray(QUERY_KEYS.AUTH.CONTRACT_OWNER("test", 1))).toBe(true);
      expect(Array.isArray(QUERY_KEYS.COMMUNITY.IS_ADMIN("uid", 1, "addr", {}))).toBe(true);
    });
  });
});

describe("Cache invalidation on logout", () => {
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
    mockQueryClientClear.mockClear();
    mockClearCache.mockClear();

    setBridgeState({
      ready: true,
      authenticated: true,
      user: mockPrivyUser,
      wallets: [mockWallet],
      isConnected: true,
    });
  });

  afterEach(() => {
    resetBridgeState();
    // Clean up any wagmi keys set during tests
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("wagmi")) keysToRemove.push(key);
    }
    for (const key of keysToRemove) localStorage.removeItem(key);
  });

  it("should clear all query caches on logout", async () => {
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Simulate logout: authenticated → false
    setBridgeState({
      authenticated: false,
      user: null,
    });

    await act(async () => {
      rerender();
    });

    expect(mockQueryClientClear).toHaveBeenCalled();
    expect(mockClearCache).toHaveBeenCalled();
  });

  it("should clear caches and force logout when user identity changes (shared auth user switch)", async () => {
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Simulate user switch: different user.id, still authenticated
    const newUser = { id: "user-456", wallet: { address: "0xABCD" } };
    setBridgeState({ user: newUser });

    await act(async () => {
      rerender();
    });

    expect(mockQueryClientClear).toHaveBeenCalled();
    expect(mockClearCache).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it("should not trigger logout when user id stays the same", async () => {
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    mockQueryClientClear.mockClear();
    mockClearCache.mockClear();

    // Re-render with same user — no identity change
    await act(async () => {
      rerender();
    });

    expect(mockQueryClientClear).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should clear wagmi localStorage keys on logout", async () => {
    // Seed localStorage with wagmi keys
    localStorage.setItem("wagmi.store", JSON.stringify({ state: { connections: {} } }));
    localStorage.setItem("wagmi.recentConnectorId", '"injected"');
    localStorage.setItem("wagmi.cache", "some-cache-data");

    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Simulate logout: authenticated → false
    setBridgeState({
      authenticated: false,
      user: null,
    });

    await act(async () => {
      rerender();
    });

    expect(localStorage.getItem("wagmi.store")).toBeNull();
    expect(localStorage.getItem("wagmi.recentConnectorId")).toBeNull();
    expect(localStorage.getItem("wagmi.cache")).toBeNull();
  });

  it("should clear wagmi localStorage keys on user identity change", async () => {
    // Seed localStorage with wagmi keys
    localStorage.setItem("wagmi.store", JSON.stringify({ state: { connections: {} } }));
    localStorage.setItem("wagmi.recentConnectorId", '"injected"');

    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Simulate user switch: different user.id, still authenticated
    const newUser = { id: "user-456", wallet: { address: "0xABCD" } };
    setBridgeState({ user: newUser });

    await act(async () => {
      rerender();
    });

    expect(localStorage.getItem("wagmi.store")).toBeNull();
    expect(localStorage.getItem("wagmi.recentConnectorId")).toBeNull();
  });

  it("should not clear non-wagmi localStorage keys on logout", async () => {
    // Seed localStorage with wagmi and non-wagmi keys
    localStorage.setItem("wagmi.store", "wagmi-data");
    localStorage.setItem("app-preference", "dark-mode");
    localStorage.setItem("privy:token", "some-token");

    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Simulate logout
    setBridgeState({
      authenticated: false,
      user: null,
    });

    await act(async () => {
      rerender();
    });

    // wagmi key should be cleared
    expect(localStorage.getItem("wagmi.store")).toBeNull();
    // Non-wagmi keys should remain untouched
    expect(localStorage.getItem("app-preference")).toBe("dark-mode");
    expect(localStorage.getItem("privy:token")).toBe("some-token");

    // Clean up non-wagmi keys
    localStorage.removeItem("app-preference");
    localStorage.removeItem("privy:token");
  });
});

describe("useAuth - Re-login with different wallet", () => {
  const walletUserA = {
    id: "user-A",
    wallet: { address: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    linkedAccounts: [
      {
        type: "wallet",
        address: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        walletClientType: "metamask",
      },
    ],
  };

  const walletUserB = {
    id: "user-B",
    wallet: { address: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB" },
    linkedAccounts: [
      {
        type: "wallet",
        address: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
        walletClientType: "metamask",
      },
    ],
  };

  const mockWalletA = {
    address: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    chainId: "eip155:10",
  };

  const mockWalletB = {
    address: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    chainId: "eip155:10",
  };

  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  beforeEach(() => {
    vi.clearAllMocks();
    setBridgeState({
      ready: true,
      authenticated: true,
      user: walletUserA,
      wallets: [mockWalletA],
      isConnected: true,
    });
  });

  afterEach(() => {
    resetBridgeState();
  });

  it("should NOT force-logout when user logs out then logs in with a different wallet", async () => {
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Step 1: Logout
    setBridgeState({
      authenticated: false,
      user: null,
      wallets: [],
      isConnected: false,
    });
    await act(async () => {
      rerender();
    });

    mockLogout.mockClear();
    mockQueryClientClear.mockClear();

    // Step 2: Login with a different wallet (different user.id)
    setBridgeState({
      authenticated: true,
      user: walletUserB,
      wallets: [mockWalletB],
      isConnected: true,
    });
    await act(async () => {
      rerender();
    });

    // The user-switch detection should NOT fire here because
    // this is a fresh login (went through logout first), not a
    // cross-tab shared auth switch.
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should NOT force-logout via watchAccount when re-logging with different wallet", async () => {
    // Simulate watchAccount firing with stale address from previous session
    let capturedOnChange: ((account: { address?: string }) => void) | null = null;
    const mockUnwatch = vi.fn();
    mockWatchAccount.mockImplementation(
      (_config: unknown, opts: { onChange: (account: { address?: string }) => void }) => {
        capturedOnChange = opts.onChange;
        return mockUnwatch;
      }
    );

    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Let the dynamic import resolve
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Step 1: Logout
    setBridgeState({
      authenticated: false,
      user: null,
      wallets: [],
      isConnected: false,
    });
    await act(async () => {
      rerender();
    });

    mockLogout.mockClear();

    // Step 2: Login with wallet B
    setBridgeState({
      authenticated: true,
      user: walletUserB,
      wallets: [mockWalletB],
      isConnected: true,
    });
    await act(async () => {
      rerender();
      await Promise.resolve();
      await Promise.resolve();
    });

    // watchAccount fires with stale address from user A's session
    // (wagmi hasn't fully updated yet)
    if (capturedOnChange) {
      act(() => {
        capturedOnChange!({ address: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });
      });
    }

    // Should NOT trigger logout — we just logged in, stale wagmi state is expected
    expect(mockLogout).not.toHaveBeenCalled();

    // Reset mock
    mockWatchAccount.mockImplementation(() => vi.fn());
  });

  it("should NOT force-logout when Privy user object lingers after logout", async () => {
    // This simulates real Privy behavior where the user object
    // is NOT immediately cleared when authenticated goes to false.
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Step 1: Logout — authenticated goes false but user object lingers
    setBridgeState({
      authenticated: false,
      user: walletUserA, // user object still present!
      wallets: [],
      isConnected: false,
    });
    await act(async () => {
      rerender();
    });

    mockLogout.mockClear();
    mockQueryClientClear.mockClear();

    // Step 2: Login with a different wallet (Privy sets new user + authenticated in one update)
    setBridgeState({
      authenticated: true,
      user: walletUserB,
      wallets: [mockWalletB],
      isConnected: true,
    });
    await act(async () => {
      rerender();
    });

    // Should NOT trigger user-switch logout — the user explicitly
    // logged out then logged in again, this is not a cross-tab switch.
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

describe("useAuth - Farcaster login (no browser-connectable wallet)", () => {
  /**
   * Farcaster login scenario:
   * - Privy authenticates the user via Farcaster (SIWF)
   * - The Farcaster account may link a wallet, but it's NOT browser-connectable
   * - createOnLogin: "users-without-wallets" sees the linked wallet and does NOT create an embedded one
   * - Result: authenticated=true, but wallets=[] and isConnected=false
   * - The user should STILL appear logged in because Privy says they're authenticated
   */
  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  const mockFarcasterUser = {
    id: "did:privy:farcaster-user-123",
    farcaster: { fid: 12345, username: "testuser" },
    // Privy links the Farcaster wallet on the user object, but it's not in useWallets()
    wallet: { address: "0xFARCASTER000000000000000000000000000001" },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    setBridgeState({
      ready: true,
      authenticated: true,
      user: mockFarcasterUser,
      wallets: [],
      isConnected: false,
    });
  });

  afterEach(() => {
    resetBridgeState();
  });

  it("should report authenticated when Privy says authenticated even without a browser wallet", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Farcaster login succeeded — Privy authenticated=true
    // Even though no wallet is connected in the browser, the user IS logged in
    expect(result.current.authenticated).toBe(true);
    expect(result.current.ready).toBe(true);
  });

  it("should report authenticated when embedded wallet is eventually created", () => {
    const { result, rerender } = renderHook(() => useAuth(), { wrapper });

    // Initially: authenticated but no wallets
    expect(result.current.authenticated).toBe(true);

    // Later: Privy creates an embedded wallet (e.g., if config changes to "all-users")
    const mockEmbeddedWallet = {
      address: "0xEMBEDDED0000000000000000000000000000001",
      chainId: "eip155:10",
      walletClientType: "privy",
    };
    setBridgeState({
      wallets: [mockEmbeddedWallet],
      isConnected: true,
    });

    rerender();

    expect(result.current.authenticated).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe("0xEMBEDDED0000000000000000000000000000001");
  });
});

describe("useAuth - Cypress mock auth compatibility", () => {
  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;
  const previousE2EBypassFlag = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "true";
    delete (window as Window & { Cypress?: unknown }).Cypress;
    localStorage.removeItem("privy:auth_state");

    setBridgeState({
      ready: false,
      authenticated: false,
      user: null,
      wallets: [],
      isConnected: false,
    });
  });

  afterEach(() => {
    resetBridgeState();
    if (previousE2EBypassFlag === undefined) {
      delete process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;
    } else {
      process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = previousE2EBypassFlag;
    }
    delete (window as Window & { Cypress?: unknown }).Cypress;
    localStorage.removeItem("privy:auth_state");
  });

  it("uses cypress auth state when Privy is not connected", () => {
    (window as Window & { Cypress?: unknown }).Cypress = {};
    localStorage.setItem(
      "privy:auth_state",
      JSON.stringify({
        authenticated: true,
        ready: true,
        user: { wallet: { address: "0x9999999999999999999999999999999999999999" } },
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.ready).toBe(true);
    expect(result.current.authenticated).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe("0x9999999999999999999999999999999999999999");
  });

  it("ignores malformed cypress auth payloads and falls back to real auth state", () => {
    (window as Window & { Cypress?: unknown }).Cypress = {};
    localStorage.setItem("privy:auth_state", "{bad-json");

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.ready).toBe(false);
    expect(result.current.authenticated).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeUndefined();
  });

  it("does not use cypress auth state when bypass flag is disabled", () => {
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "false";
    (window as Window & { Cypress?: unknown }).Cypress = {};
    localStorage.setItem(
      "privy:auth_state",
      JSON.stringify({
        authenticated: true,
        user: { wallet: { address: "0x9999999999999999999999999999999999999999" } },
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.ready).toBe(false);
    expect(result.current.authenticated).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeUndefined();
  });
});

describe("useAuth - Cross-tab logout synchronization", () => {
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
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetToken.mockResolvedValue(null);

    setBridgeState({
      ready: true,
      authenticated: true,
      user: mockPrivyUser,
      wallets: [mockWallet],
      isConnected: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    mockGetToken.mockReset();
    resetBridgeState();
    document.cookie = "privy-session=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("should not logout when under failure threshold", async () => {
    renderHook(() => useAuth(), { wrapper });

    // 1st failure: initial delayed check at 500ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(mockLogout).not.toHaveBeenCalled();

    // 2nd failure: first interval tick at 10000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9500);
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should logout after 3 consecutive failures", async () => {
    renderHook(() => useAuth(), { wrapper });

    // 1st failure at 500ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    // 2nd failure at 10000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9500);
    });
    // 3rd failure at 20000ms → triggers logout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it("should reset failure counter when token becomes available", async () => {
    mockGetToken
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue("valid-token");

    renderHook(() => useAuth(), { wrapper });

    // 1st failure
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    // 2nd failure
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9500);
    });
    // 3rd call: token available → counter resets
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should detect privy-session cookie and prevent logout", async () => {
    document.cookie = "privy-session=abc123";

    renderHook(() => useAuth(), { wrapper });

    // Advance through 4 check intervals
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should delay initial auth check by 500ms", async () => {
    renderHook(() => useAuth(), { wrapper });

    expect(mockGetToken).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });

  it("should cleanup timers on unmount", async () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });

    expect(mockGetToken).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });

    await vi.advanceTimersByTimeAsync(20000);

    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("should trigger checkAuthStatus on storage event", async () => {
    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "privy:token",
          newValue: null,
        })
      );
      await Promise.resolve();
    });

    expect(mockGetToken).toHaveBeenCalled();
  });

  it("should not set up auth checks when not authenticated", async () => {
    setBridgeState({
      ready: true,
      authenticated: false,
      user: null,
    });

    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should reset failure counter on logout and re-login", async () => {
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Accumulate 2 failures
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9500);
    });

    // Simulate logout: authenticated → false
    setBridgeState({
      authenticated: false,
      user: null,
      wallets: [],
    });

    await act(async () => {
      rerender();
    });

    // Simulate re-login: authenticated → true
    setBridgeState({
      authenticated: true,
      user: mockPrivyUser,
      wallets: [mockWallet],
      isConnected: true,
    });

    await act(async () => {
      rerender();
    });

    mockLogout.mockClear();

    // Need 3 new failures (counter was reset)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9500);
    });
    expect(mockLogout).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it("should treat token check errors as failures", async () => {
    mockGetToken.mockRejectedValue(new Error("network error"));

    renderHook(() => useAuth(), { wrapper });

    // 1st failure (error) at 500ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    // 2nd failure (error) at 10000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9500);
    });
    // 3rd failure (error) at 20000ms → triggers logout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it("should trigger checkAuthStatus on token replacement (user switch)", async () => {
    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "privy:token",
          oldValue: "old-token",
          newValue: "new-token",
        })
      );
      await Promise.resolve();
    });

    expect(mockGetToken).toHaveBeenCalled();
  });

  it("should trigger checkAuthStatus on privy:user change", async () => {
    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "privy:user",
          oldValue: JSON.stringify({ id: "user-123" }),
          newValue: JSON.stringify({ id: "user-456" }),
        })
      );
      await Promise.resolve();
    });

    expect(mockGetToken).toHaveBeenCalled();
  });

  it("should not trigger on privy:token set when no previous value", async () => {
    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "privy:token",
          oldValue: null,
          newValue: "new-token",
        })
      );
      await Promise.resolve();
    });

    // No old value means initial login, not a switch — should not trigger
    expect(mockGetToken).not.toHaveBeenCalled();
  });
});
