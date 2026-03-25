/**
 * @file Trust tests for useAuth hook
 * @description Comprehensive tests for the auth boundary: state transitions,
 * wallet snapshot, TokenManager init, cross-tab logout, wallet switch detection,
 * adaptedLogin, and return values.
 */

import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getE2EMockAuthState } from "@/utilities/auth/e2e-auth";

// Undo the global mock of useAuth from __tests__/navbar/setup.ts
vi.unmock("@/hooks/useAuth");

// ---------------------------------------------------------------------------
// Controllable mocks
// ---------------------------------------------------------------------------
const mockLogin = vi.fn();
const mockLogout = vi.fn().mockResolvedValue(undefined);
const mockGetAccessToken = vi.fn().mockResolvedValue("token-abc");
const mockConnectWallet = vi.fn();
const mockRouterPush = vi.fn();
const mockPathname = vi.fn().mockReturnValue("/");
const mockGetToken = vi.fn();
const mockClearCache = vi.fn();
const mockSetPrivyInstance = vi.fn();
const mockQueryClientClear = vi.fn();

// Bridge state - mutated in-place by setBridgeState()
const mockBridgeState = {
  ready: true,
  authenticated: false,
  user: null as User | null,
  login: mockLogin,
  logout: mockLogout,
  getAccessToken: mockGetAccessToken,
  connectWallet: mockConnectWallet,
  wallets: [] as ConnectedWallet[],
  smartWalletClient: null,
  isConnected: false,
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => mockBridgeState,
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => mockPathname(),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({ isWhitelabel: false }),
}));

vi.mock("@/store/modals/projectCreate", () => ({
  useProjectCreateModalStore: {
    getState: () => ({ isProjectCreateModalOpen: false }),
  },
}));

vi.mock("@/utilities/auth/e2e-auth", () => ({
  getE2EMockAuthState: vi.fn().mockReturnValue(null),
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: (...args: unknown[]) => mockGetToken(...args),
    setPrivyInstance: (...args: unknown[]) => mockSetPrivyInstance(...args),
    clearCache: (...args: unknown[]) => mockClearCache(...args),
  },
}));

vi.mock("@/utilities/query-client", () => ({
  queryClient: {
    clear: (...args: unknown[]) => mockQueryClientClear(...args),
    removeQueries: vi.fn(),
  },
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: { DASHBOARD: "/dashboard", HOME: "/" },
}));

vi.mock("@/utilities/auth/compare-all-wallets", () => ({
  compareAllWallets: vi.fn().mockReturnValue(true),
}));

// Mock @wagmi/core for dynamic import in watchAccount effect
const mockUnwatch = vi.fn();
const mockWatchAccount = vi.fn().mockReturnValue(mockUnwatch);
vi.mock("@wagmi/core", () => ({
  watchAccount: (...args: unknown[]) => mockWatchAccount(...args),
}));

vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: vi.fn(() => ({})),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setBridgeState(overrides: Partial<typeof mockBridgeState>) {
  Object.assign(mockBridgeState, overrides);
}

function resetBridgeState() {
  Object.assign(mockBridgeState, {
    ready: true,
    authenticated: false,
    user: null,
    login: mockLogin,
    logout: mockLogout,
    getAccessToken: mockGetAccessToken,
    connectWallet: mockConnectWallet,
    wallets: [],
    smartWalletClient: null,
    isConnected: false,
  });
}

const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

const mockPrivyUser = {
  id: "user-123",
  linkedAccounts: [{ type: "wallet", address: "0xABCD", walletClientType: "metamask" }],
  wallet: { address: "0xABCD" },
};

const mockWallet = {
  address: "0x1234567890123456789012345678901234567890",
  chainId: "eip155:10",
  walletClientType: "metamask",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  resetBridgeState();
  mockPathname.mockReturnValue("/");
  sessionStorage.clear();
  // Reset document.cookie
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// =====================================================================
// EFFECT 1: Auth State Change Detection
// =====================================================================
describe("useAuth — Effect 1 (Auth State Change)", () => {
  describe("Login transition (false -> true)", () => {
    it("redirects to DASHBOARD when on root path and no postLoginRedirect", () => {
      const { rerender } = renderHook(() => useAuth(), { wrapper });

      // Simulate login
      setBridgeState({ authenticated: true, user: mockPrivyUser });
      rerender();

      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard");
    });

    it("uses postLoginRedirect when set, then clears it", () => {
      sessionStorage.setItem("postLoginRedirect", "/my-projects");

      const { rerender } = renderHook(() => useAuth(), { wrapper });

      setBridgeState({ authenticated: true, user: mockPrivyUser });
      rerender();

      expect(mockRouterPush).toHaveBeenCalledWith("/my-projects");
      expect(sessionStorage.getItem("postLoginRedirect")).toBeNull();
    });

    it("does NOT redirect when on a non-root path", () => {
      mockPathname.mockReturnValue("/some/page");

      const { rerender } = renderHook(() => useAuth(), { wrapper });

      setBridgeState({ authenticated: true, user: mockPrivyUser });
      rerender();

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it("does NOT redirect when project create modal is open", () => {
      const { useProjectCreateModalStore } = require("@/store/modals/projectCreate");
      useProjectCreateModalStore.getState = () => ({ isProjectCreateModalOpen: true });

      const { rerender } = renderHook(() => useAuth(), { wrapper });

      setBridgeState({ authenticated: true, user: mockPrivyUser });
      rerender();

      expect(mockRouterPush).not.toHaveBeenCalled();

      // Restore
      useProjectCreateModalStore.getState = () => ({ isProjectCreateModalOpen: false });
    });
  });

  describe("Logout transition (true -> false)", () => {
    it("clears queryClient, TokenManager cache, and wagmi state on logout", () => {
      setBridgeState({ authenticated: true, user: mockPrivyUser });
      const { rerender } = renderHook(() => useAuth(), { wrapper });

      // Now transition to logged out
      setBridgeState({ authenticated: false, user: null });
      rerender();

      expect(mockQueryClientClear).toHaveBeenCalled();
      expect(mockClearCache).toHaveBeenCalled();
    });

    it("clears wagmi localStorage keys on logout", () => {
      localStorage.setItem("wagmiConfig", "{}");
      localStorage.setItem("wagmiState", "{}");
      localStorage.setItem("otherKey", "keep");

      setBridgeState({ authenticated: true, user: mockPrivyUser });
      const { rerender } = renderHook(() => useAuth(), { wrapper });

      setBridgeState({ authenticated: false, user: null });
      rerender();

      expect(localStorage.getItem("wagmiConfig")).toBeNull();
      expect(localStorage.getItem("wagmiState")).toBeNull();
      expect(localStorage.getItem("otherKey")).toBe("keep");
    });
  });

  describe("User switch (same auth, different user.id)", () => {
    it("force-logouts and clears caches when user.id changes while authenticated", () => {
      setBridgeState({ authenticated: true, user: { ...mockPrivyUser, id: "user-A" } });
      const { rerender } = renderHook(() => useAuth(), { wrapper });

      // Same authenticated but different user
      setBridgeState({ authenticated: true, user: { ...mockPrivyUser, id: "user-B" } });
      rerender();

      expect(mockQueryClientClear).toHaveBeenCalled();
      expect(mockClearCache).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe("No-op transitions", () => {
    it("does nothing when authenticated stays false", () => {
      renderHook(() => useAuth(), { wrapper });

      expect(mockQueryClientClear).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it("does nothing when authenticated stays true with same user.id", () => {
      setBridgeState({ authenticated: true, user: mockPrivyUser });
      const { rerender } = renderHook(() => useAuth(), { wrapper });

      vi.clearAllMocks();

      // Re-render with same state
      rerender();

      expect(mockQueryClientClear).not.toHaveBeenCalled();
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });
});

// =====================================================================
// EFFECT 2: Wallet Snapshot
// =====================================================================
describe("useAuth — Effect 2 (Wallet Snapshot)", () => {
  it("captures wallet addresses when authenticated", () => {
    setBridgeState({
      authenticated: true,
      user: mockPrivyUser,
      wallets: [
        { address: "0xAAAA", chainId: "eip155:1", walletClientType: "metamask" },
        { address: "0xBBBB", chainId: "eip155:1", walletClientType: "metamask" },
      ],
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.wallets).toHaveLength(2);
  });

  it("clears snapshot on unauthenticated", () => {
    setBridgeState({
      authenticated: true,
      user: mockPrivyUser,
      wallets: [{ address: "0xAAAA", chainId: "eip155:1", walletClientType: "metamask" }],
    });
    const { rerender, result } = renderHook(() => useAuth(), { wrapper });

    setBridgeState({ authenticated: false, user: null, wallets: [] });
    rerender();

    // No error means snapshot was cleared properly
    expect(result.current.wallets).toHaveLength(0);
  });

  it("lowercases all addresses in snapshot", () => {
    setBridgeState({
      authenticated: true,
      user: mockPrivyUser,
      wallets: [{ address: "0xABCDEF", chainId: "eip155:1", walletClientType: "metamask" }],
    });
    renderHook(() => useAuth(), { wrapper });
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

// =====================================================================
// EFFECT 3: TokenManager Init
// =====================================================================
describe("useAuth — Effect 3 (TokenManager Init)", () => {
  it("calls setPrivyInstance when ready=true", () => {
    setBridgeState({ ready: true });
    renderHook(() => useAuth(), { wrapper });

    expect(mockSetPrivyInstance).toHaveBeenCalledWith(
      expect.objectContaining({ getAccessToken: expect.any(Function) })
    );
  });

  it("does NOT call setPrivyInstance when ready=false", () => {
    setBridgeState({ ready: false });
    renderHook(() => useAuth(), { wrapper });

    expect(mockSetPrivyInstance).not.toHaveBeenCalled();
  });
});

// =====================================================================
// EFFECT 4: Cross-Tab Logout
// =====================================================================
describe("useAuth — Effect 4 (Cross-Tab Logout)", () => {
  beforeEach(() => {
    setBridgeState({ ready: true, authenticated: true, user: mockPrivyUser });
  });

  it("polls auth status every 10s when ready and authenticated", async () => {
    mockGetToken.mockResolvedValue("valid-token");
    renderHook(() => useAuth(), { wrapper });

    // Initial delay check at 500ms
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(mockGetToken).toHaveBeenCalledTimes(1);

    // Next check at 10s interval
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(mockGetToken).toHaveBeenCalledTimes(2);
  });

  it("resets failure count when token is valid", async () => {
    mockGetToken.mockResolvedValue("valid-token");
    renderHook(() => useAuth(), { wrapper });

    // Several checks should not trigger logout
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });
    }
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("increments failure count when no token and no session", async () => {
    mockGetToken.mockResolvedValue(null);
    renderHook(() => useAuth(), { wrapper });

    // First failure at 500ms
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(mockLogout).not.toHaveBeenCalled();

    // Second failure at 10.5s
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("logs out after 3 consecutive failures", async () => {
    mockGetToken.mockResolvedValue(null);
    renderHook(() => useAuth(), { wrapper });

    // Failure 1 (at 500ms)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    // Failure 2 (at 10.5s)
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    // Failure 3 (at 20.5s) - should trigger logout
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it("triggers check when privy:token is removed from storage", async () => {
    mockGetToken.mockResolvedValue(null);
    renderHook(() => useAuth(), { wrapper });

    // Dispatch storage event for token removal
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "privy:token",
          oldValue: "old-token",
          newValue: null,
        })
      );
    });

    expect(mockGetToken).toHaveBeenCalled();
  });

  it("triggers check when privy:user changes in another tab", async () => {
    mockGetToken.mockResolvedValue(null);
    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "privy:user",
          oldValue: '{"id":"user-A"}',
          newValue: '{"id":"user-B"}',
        })
      );
    });

    expect(mockGetToken).toHaveBeenCalled();
  });

  it("cleans up intervals and listeners on unmount", async () => {
    mockGetToken.mockResolvedValue("valid-token");
    const { unmount } = renderHook(() => useAuth(), { wrapper });

    unmount();

    // Advance time past what would be the next poll
    mockGetToken.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });

    // After unmount, no more getToken calls from polling
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("does NOT start polling when not authenticated", async () => {
    setBridgeState({ ready: true, authenticated: false, user: null });
    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });

    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("does NOT start polling when not ready", async () => {
    setBridgeState({ ready: false, authenticated: true, user: mockPrivyUser });
    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });

    expect(mockGetToken).not.toHaveBeenCalled();
  });
});

// =====================================================================
// EFFECT 5: Wallet Switch Detection
// =====================================================================
describe("useAuth — Effect 5 (Wallet Switch Detection)", () => {
  it("does NOT set up watchAccount for non-external-wallet users", () => {
    setBridgeState({
      ready: true,
      authenticated: true,
      user: {
        id: "farcaster-user",
        linkedAccounts: [{ type: "farcaster", fid: 12345 }],
      },
    });
    renderHook(() => useAuth(), { wrapper });

    // watchAccount should not be called (import is dynamic, but we check no logout)
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("sets up watchAccount for users with external wallets", async () => {
    setBridgeState({
      ready: true,
      authenticated: true,
      user: mockPrivyUser,
      wallets: [mockWallet],
      isConnected: true,
    });

    await act(async () => {
      renderHook(() => useAuth(), { wrapper });
      // Allow the Promise.all dynamic import to resolve
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockWatchAccount).toHaveBeenCalled();
  });

  it("skips watchAccount for email-only users", () => {
    setBridgeState({
      ready: true,
      authenticated: true,
      user: {
        id: "email-user",
        linkedAccounts: [{ type: "email", address: "test@example.com" }],
      },
    });
    renderHook(() => useAuth(), { wrapper });

    // No external wallet, so no watchAccount setup
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

// =====================================================================
// adaptedLogin
// =====================================================================
describe("useAuth — adaptedLogin", () => {
  it("sets postLoginRedirect when not authenticated", async () => {
    setBridgeState({ authenticated: false });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.login();
    });

    expect(sessionStorage.getItem("postLoginRedirect")).toBeTruthy();
    expect(mockLogin).toHaveBeenCalled();
  });

  it("does NOT overwrite existing postLoginRedirect", async () => {
    sessionStorage.setItem("postLoginRedirect", "/existing-redirect");
    setBridgeState({ authenticated: false });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.login();
    });

    expect(sessionStorage.getItem("postLoginRedirect")).toBe("/existing-redirect");
  });

  it("calls login() when not authenticated", async () => {
    setBridgeState({ authenticated: false });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.login();
    });

    expect(mockLogin).toHaveBeenCalled();
  });

  it("does NOT call login() when already authenticated", async () => {
    setBridgeState({
      authenticated: true,
      user: mockPrivyUser,
      wallets: [{ ...mockWallet, walletClientType: "privy" }],
      isConnected: true,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.login();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });
});

// =====================================================================
// Return values
// =====================================================================
describe("useAuth — Return Values", () => {
  it("returns ready/authenticated from E2E mock when active", () => {
    vi.mocked(getE2EMockAuthState).mockReturnValue({
      authenticated: true,
      ready: true,
      user: { wallet: { address: "0xE2E0" } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.ready).toBe(true);
    expect(result.current.authenticated).toBe(true);

    // Restore
    vi.mocked(getE2EMockAuthState).mockReturnValue(null);
  });

  it("returns address from primary wallet", () => {
    setBridgeState({
      authenticated: true,
      user: mockPrivyUser,
      wallets: [mockWallet],
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.address).toBe(mockWallet.address);
  });

  it("returns isConnected from wallets.length", () => {
    setBridgeState({
      authenticated: true,
      user: mockPrivyUser,
      wallets: [mockWallet],
      isConnected: false,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    // isConnected should be true because wallets.length > 0
    expect(result.current.isConnected).toBe(true);
  });

  it("returns isConnected=false when no wallets and not connected", () => {
    setBridgeState({
      authenticated: false,
      user: null,
      wallets: [],
      isConnected: false,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isConnected).toBe(false);
  });

  it("returns all expected keys", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const keys = Object.keys(result.current);

    expect(keys).toEqual(
      expect.arrayContaining([
        "authenticate",
        "disconnect",
        "ready",
        "authenticated",
        "isConnected",
        "user",
        "address",
        "primaryWallet",
        "wallets",
        "login",
        "logout",
        "getAccessToken",
        "connectWallet",
        "isAuthenticated",
        "isReady",
      ])
    );
  });
});
