/**
 * @file Tests for useAuth hook
 * @description Tests cache invalidation on logout using centralized QUERY_KEYS
 * and cross-tab logout synchronization with failure threshold
 */

import { act, renderHook } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { QUERY_KEYS } from "@/utilities/queryKeys";

// Undo the global mock of useAuth from __tests__/navbar/setup.ts
// so we can test the real hook implementation
jest.unmock("@/hooks/useAuth");

// Controllable mock functions for hook tests
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockGetAccessToken = jest.fn();
const mockUsePrivy = jest.fn();
const mockUseWallets = jest.fn();
const mockUseAccount = jest.fn();
const mockGetToken = jest.fn();

// Override global mocks for per-test control
jest.mock("@privy-io/react-auth", () => ({
  usePrivy: () => mockUsePrivy(),
  useWallets: () => mockUseWallets(),
}));

jest.mock("wagmi", () => ({
  useAccount: () => mockUseAccount(),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectors: [] })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn() })),
  createConfig: jest.fn(),
}));

jest.mock("@wagmi/core", () => ({
  watchAccount: jest.fn(() => jest.fn()),
}));

const mockQueryClientClear = jest.fn();
const mockClearCache = jest.fn();

jest.mock("@/utilities/query-client", () => ({
  queryClient: {
    clear: (...args: unknown[]) => mockQueryClientClear(...args),
    removeQueries: jest.fn(),
  },
}));

// Mock TokenManager module-level to ensure next/jest resolves the same mock instance
jest.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: (...args: unknown[]) => mockGetToken(...args),
    setPrivyInstance: jest.fn(),
    clearTokens: jest.fn(),
    clearCache: (...args: unknown[]) => mockClearCache(...args),
  },
}));

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

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      user: mockPrivyUser,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
    });

    mockUseWallets.mockReturnValue({ wallets: [mockWallet] });

    mockUseAccount.mockReturnValue({
      address: mockWallet.address,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
    });
  });

  afterEach(() => {
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
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
      user: null,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
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
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      user: newUser,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
    });

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
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
      user: null,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
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
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      user: newUser,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
    });

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
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
      user: null,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
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
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockGetToken.mockResolvedValue(null);

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      user: mockPrivyUser,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
    });

    mockUseWallets.mockReturnValue({
      wallets: [mockWallet],
    });

    mockUseAccount.mockReturnValue({
      address: mockWallet.address,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    mockGetToken.mockReset();
    document.cookie = "privy-session=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("should not logout when under failure threshold", async () => {
    renderHook(() => useAuth(), { wrapper });

    // 1st failure: initial delayed check at 500ms
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    expect(mockLogout).not.toHaveBeenCalled();

    // 2nd failure: first interval tick at 10000ms
    await act(async () => {
      await jest.advanceTimersByTimeAsync(9500);
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should logout after 3 consecutive failures", async () => {
    renderHook(() => useAuth(), { wrapper });

    // 1st failure at 500ms
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    // 2nd failure at 10000ms
    await act(async () => {
      await jest.advanceTimersByTimeAsync(9500);
    });
    // 3rd failure at 20000ms → triggers logout
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000);
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
      await jest.advanceTimersByTimeAsync(500);
    });
    // 2nd failure
    await act(async () => {
      await jest.advanceTimersByTimeAsync(9500);
    });
    // 3rd call: token available → counter resets
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000);
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should detect privy-session cookie and prevent logout", async () => {
    document.cookie = "privy-session=abc123";

    renderHook(() => useAuth(), { wrapper });

    // Advance through 4 check intervals
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(9500);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000);
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should delay initial auth check by 500ms", async () => {
    renderHook(() => useAuth(), { wrapper });

    expect(mockGetToken).not.toHaveBeenCalled();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });

    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });

  it("should cleanup timers on unmount", async () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });

    expect(mockGetToken).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });

    await jest.advanceTimersByTimeAsync(20000);

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
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
      user: null,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
    });

    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(20000);
    });

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should reset failure counter on logout and re-login", async () => {
    const { rerender } = renderHook(() => useAuth(), { wrapper });

    // Accumulate 2 failures
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(9500);
    });

    // Simulate logout: authenticated → false
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
      user: null,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
    });
    mockUseWallets.mockReturnValue({ wallets: [] });

    await act(async () => {
      rerender();
    });

    // Simulate re-login: authenticated → true
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      user: mockPrivyUser,
      login: mockLogin,
      logout: mockLogout,
      getAccessToken: mockGetAccessToken,
    });
    mockUseWallets.mockReturnValue({ wallets: [mockWallet] });
    mockUseAccount.mockReturnValue({
      address: mockWallet.address,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
    });

    await act(async () => {
      rerender();
    });

    mockLogout.mockClear();

    // Need 3 new failures (counter was reset)
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(9500);
    });
    expect(mockLogout).not.toHaveBeenCalled();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it("should treat token check errors as failures", async () => {
    mockGetToken.mockRejectedValue(new Error("network error"));

    renderHook(() => useAuth(), { wrapper });

    // 1st failure (error) at 500ms
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    // 2nd failure (error) at 10000ms
    await act(async () => {
      await jest.advanceTimersByTimeAsync(9500);
    });
    // 3rd failure (error) at 20000ms → triggers logout
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000);
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
