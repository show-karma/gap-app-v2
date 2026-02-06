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

jest.mock("@/utilities/query-client", () => ({
  queryClient: {
    removeQueries: jest.fn(),
  },
}));

// Mock TokenManager module-level to ensure next/jest resolves the same mock instance
jest.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: (...args: unknown[]) => mockGetToken(...args),
    setPrivyInstance: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

describe("useAuth - Query Key Consistency", () => {
  describe("QUERY_KEYS structure for cache invalidation", () => {
    it("should have AUTH.STAFF_AUTHORIZATION_BASE key defined", () => {
      expect(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE).toBeDefined();
      expect(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE).toEqual(["staffAuthorization"]);
    });

    it("should have AUTH.CONTRACT_OWNER_BASE key defined", () => {
      expect(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE).toBeDefined();
      expect(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE).toEqual(["contract-owner"]);
    });

    it("should have COMMUNITY.IS_ADMIN_BASE key defined", () => {
      expect(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE).toBeDefined();
      expect(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE).toEqual(["isCommunityAdmin"]);
    });

    it("should have full key factories that start with base keys", () => {
      // Full keys should be prefixed with base keys for removeQueries to work
      const fullAdminKey = QUERY_KEYS.COMMUNITY.IS_ADMIN("uid", 1, "addr", {});
      const fullStaffKey = QUERY_KEYS.AUTH.STAFF_AUTHORIZATION("addr");
      const fullOwnerKey = QUERY_KEYS.AUTH.CONTRACT_OWNER("addr", 1);

      expect(fullAdminKey[0]).toBe(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE[0]);
      expect(fullStaffKey[0]).toBe(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE[0]);
      expect(fullOwnerKey[0]).toBe(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE[0]);
    });

    it("should have all necessary query key factories for auth hooks", () => {
      // Verify all auth-related keys exist
      expect(typeof QUERY_KEYS.AUTH.STAFF_AUTHORIZATION).toBe("function");
      expect(typeof QUERY_KEYS.AUTH.CONTRACT_OWNER).toBe("function");
      expect(typeof QUERY_KEYS.COMMUNITY.IS_ADMIN).toBe("function");
    });
  });

  describe("Query key format validation", () => {
    it("should return arrays for all query keys", () => {
      expect(Array.isArray(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE)).toBe(true);
      expect(Array.isArray(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE)).toBe(true);
      expect(Array.isArray(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE)).toBe(true);

      expect(Array.isArray(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION("test"))).toBe(true);
      expect(Array.isArray(QUERY_KEYS.AUTH.CONTRACT_OWNER("test", 1))).toBe(true);
      expect(Array.isArray(QUERY_KEYS.COMMUNITY.IS_ADMIN("uid", 1, "addr", {}))).toBe(true);
    });

    it("should properly lowercase addresses in STAFF_AUTHORIZATION key", () => {
      const upperCaseAddr = "0xABCDEF1234567890";
      const key = QUERY_KEYS.AUTH.STAFF_AUTHORIZATION(upperCaseAddr);
      expect(key[1]).toBe(upperCaseAddr.toLowerCase());
    });
  });
});

describe("Cache invalidation pattern verification", () => {
  it("should document that useAuth clears these caches on logout", () => {
    // This test documents the cache keys that useAuth clears on logout
    // When adding new permission hooks, they must be added to useAuth.ts
    const cacheKeysToBeCleared = [
      QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE, // useCheckCommunityAdmin
      QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE, // useStaff
      QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE, // useContractOwner
    ];

    // Verify all keys are defined
    cacheKeysToBeCleared.forEach((key) => {
      expect(key).toBeDefined();
      expect(Array.isArray(key)).toBe(true);
      expect(key.length).toBeGreaterThan(0);
    });
  });

  it("should verify that base keys match the first element of full keys", () => {
    // This ensures removeQueries({ queryKey: BASE_KEY }) will match full keys
    // React Query uses prefix matching for removeQueries

    // isCommunityAdmin
    const adminBase = QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE;
    const adminFull = QUERY_KEYS.COMMUNITY.IS_ADMIN("uid", 10, "0xaddr", {});
    expect(adminFull[0]).toBe(adminBase[0]);

    // staffAuthorization
    const staffBase = QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE;
    const staffFull = QUERY_KEYS.AUTH.STAFF_AUTHORIZATION("0xaddr");
    expect(staffFull[0]).toBe(staffBase[0]);

    // contract-owner
    const ownerBase = QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE;
    const ownerFull = QUERY_KEYS.AUTH.CONTRACT_OWNER("0xaddr", 10);
    expect(ownerFull[0]).toBe(ownerBase[0]);
  });
});

describe("useAuth - Cross-tab logout synchronization", () => {
  let consoleErrorSpy: jest.SpyInstance;

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
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
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

    // 2nd failure: first interval tick at 5000ms
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4500);
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should logout after 3 consecutive failures", async () => {
    renderHook(() => useAuth(), { wrapper });

    // 1st failure at 500ms
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    // 2nd failure at 5000ms
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4500);
    });
    // 3rd failure at 10000ms → triggers logout
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
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
      await jest.advanceTimersByTimeAsync(4500);
    });
    // 3rd call: token available → counter resets
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
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
      await jest.advanceTimersByTimeAsync(4500);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
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
      await jest.advanceTimersByTimeAsync(4500);
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
      await jest.advanceTimersByTimeAsync(4500);
    });
    expect(mockLogout).not.toHaveBeenCalled();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });

    expect(mockLogout).toHaveBeenCalled();
  });
});
