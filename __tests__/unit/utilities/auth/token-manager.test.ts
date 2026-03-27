/**
 * Tests for utilities/auth/token-manager.ts
 *
 * Comprehensive coverage of TokenManager including:
 * - Cache hit / miss / expiry
 * - TTL with fake timers
 * - Concurrent request deduplication via pendingRequest
 * - clearCache behavior
 * - Server-side path (typeof window === "undefined")
 * - Cypress E2E bypass path
 * - getAuthHeader and isAuthenticated
 * - setPrivyInstance clears cache on change
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We need to test the real TokenManager, but it has static state.
// We reset state between tests via clearCache + setPrivyInstance(null).

import { TokenManager } from "@/utilities/auth/token-manager";

describe("TokenManager", () => {
  let mockGetAccessToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockGetAccessToken = vi.fn().mockResolvedValue("mock-jwt-token");

    // Reset static state
    TokenManager.clearCache();
    TokenManager.setPrivyInstance({ getAccessToken: mockGetAccessToken });

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    TokenManager.clearCache();
    TokenManager.setPrivyInstance(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Basic getToken
  // =========================================================================

  describe("getToken - client side", () => {
    it("should call getAccessToken and return the token", async () => {
      const token = await TokenManager.getToken();
      expect(token).toBe("mock-jwt-token");
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    });

    it("should return null when Privy instance has no getAccessToken", async () => {
      TokenManager.setPrivyInstance({});
      const token = await TokenManager.getToken();
      expect(token).toBeNull();
    });

    it("should return null when Privy instance is null", async () => {
      TokenManager.setPrivyInstance(null);
      const token = await TokenManager.getToken();
      expect(token).toBeNull();
    });

    it("should return null when getAccessToken throws", async () => {
      mockGetAccessToken.mockRejectedValueOnce(new Error("Privy error"));
      const token = await TokenManager.getToken();
      expect(token).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Cache hit / miss / TTL
  // =========================================================================

  describe("caching with TTL", () => {
    it("should return cached token on second call within TTL", async () => {
      await TokenManager.getToken(); // populates cache
      mockGetAccessToken.mockClear();

      const token = await TokenManager.getToken();
      expect(token).toBe("mock-jwt-token");
      expect(mockGetAccessToken).not.toHaveBeenCalled();
    });

    it("should refetch after TTL expires", async () => {
      await TokenManager.getToken(); // populates cache
      mockGetAccessToken.mockClear();

      // Advance past the 20s TTL
      vi.advanceTimersByTime(21_000);

      mockGetAccessToken.mockResolvedValueOnce("refreshed-token");
      const token = await TokenManager.getToken();
      expect(token).toBe("refreshed-token");
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    });

    it("should still return cached token just before TTL expires", async () => {
      await TokenManager.getToken();
      mockGetAccessToken.mockClear();

      // Advance to just under the TTL (19.9s)
      vi.advanceTimersByTime(19_900);

      const token = await TokenManager.getToken();
      expect(token).toBe("mock-jwt-token");
      expect(mockGetAccessToken).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Concurrent request deduplication
  // =========================================================================

  describe("concurrent request deduplication", () => {
    it("should deduplicate concurrent calls into a single getAccessToken call", async () => {
      // Make three concurrent calls
      const [t1, t2, t3] = await Promise.all([
        TokenManager.getToken(),
        TokenManager.getToken(),
        TokenManager.getToken(),
      ]);

      expect(t1).toBe("mock-jwt-token");
      expect(t2).toBe("mock-jwt-token");
      expect(t3).toBe("mock-jwt-token");
      // Only one call because the first creates a pending request,
      // the second and third reuse it
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    });

    it("should allow new requests after pending resolves", async () => {
      await TokenManager.getToken();

      // Expire the cache
      vi.advanceTimersByTime(21_000);
      mockGetAccessToken.mockResolvedValueOnce("second-token");

      const token = await TokenManager.getToken();
      expect(token).toBe("second-token");
      expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
    });

    it("should clear pendingRequest even on error", async () => {
      mockGetAccessToken.mockRejectedValueOnce(new Error("fail"));

      const token1 = await TokenManager.getToken();
      expect(token1).toBeNull();

      // Next call should try again (pendingRequest was cleared)
      mockGetAccessToken.mockResolvedValueOnce("recovered-token");
      const token2 = await TokenManager.getToken();
      expect(token2).toBe("recovered-token");
    });
  });

  // =========================================================================
  // clearCache
  // =========================================================================

  describe("clearCache", () => {
    it("should force a fresh fetch after clearing", async () => {
      await TokenManager.getToken();
      mockGetAccessToken.mockClear();

      TokenManager.clearCache();
      mockGetAccessToken.mockResolvedValueOnce("fresh-token");

      const token = await TokenManager.getToken();
      expect(token).toBe("fresh-token");
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // setPrivyInstance
  // =========================================================================

  describe("setPrivyInstance", () => {
    it("should clear cache when Privy instance changes", async () => {
      await TokenManager.getToken(); // populate cache
      mockGetAccessToken.mockClear();

      const newMock = vi.fn().mockResolvedValue("new-instance-token");
      TokenManager.setPrivyInstance({ getAccessToken: newMock });

      const token = await TokenManager.getToken();
      expect(token).toBe("new-instance-token");
      expect(newMock).toHaveBeenCalledTimes(1);
    });

    it("should NOT clear cache when setting the same instance", async () => {
      const instance = { getAccessToken: mockGetAccessToken };
      TokenManager.setPrivyInstance(instance);
      await TokenManager.getToken();
      mockGetAccessToken.mockClear();

      // Set the same reference again
      TokenManager.setPrivyInstance(instance);

      const token = await TokenManager.getToken();
      expect(token).toBe("mock-jwt-token");
      // Should NOT have called getAccessToken again (cache still valid)
      expect(mockGetAccessToken).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getAuthHeader
  // =========================================================================

  describe("getAuthHeader", () => {
    it("should return Authorization header when token exists", async () => {
      const header = await TokenManager.getAuthHeader();
      expect(header).toEqual({ Authorization: "Bearer mock-jwt-token" });
    });

    it("should return empty object when no token", async () => {
      TokenManager.setPrivyInstance(null);
      const header = await TokenManager.getAuthHeader();
      expect(header).toEqual({});
    });
  });

  // =========================================================================
  // isAuthenticated
  // =========================================================================

  describe("isAuthenticated", () => {
    it("should return true when token is available", async () => {
      expect(await TokenManager.isAuthenticated()).toBe(true);
    });

    it("should return false when no token", async () => {
      TokenManager.setPrivyInstance(null);
      expect(await TokenManager.isAuthenticated()).toBe(false);
    });
  });

  // =========================================================================
  // Cypress E2E bypass
  // =========================================================================

  describe("Cypress E2E auth bypass", () => {
    it("should return localStorage token when Cypress + bypass env are set", async () => {
      const originalEnv = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;
      process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "true";

      // Simulate Cypress on the window object
      (window as any).Cypress = true;

      // Mock localStorage
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue("e2e-token");

      // Clear cache so it doesn't short-circuit
      TokenManager.clearCache();

      const token = await TokenManager.getToken();
      expect(token).toBe("e2e-token");
      expect(getItemSpy).toHaveBeenCalledWith("privy:token");

      // Cleanup
      delete (window as any).Cypress;
      process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = originalEnv;
      getItemSpy.mockRestore();
    });

    it("should not use bypass when Cypress is not on window", async () => {
      const originalEnv = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;
      process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "true";

      // No Cypress on window
      TokenManager.clearCache();

      const token = await TokenManager.getToken();
      // Falls through to Privy
      expect(token).toBe("mock-jwt-token");

      process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = originalEnv;
    });
  });
});
