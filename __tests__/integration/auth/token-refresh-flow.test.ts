/**
 * Integration tests: TokenManager + api-client + fetchData working together
 *
 * These tests use the REAL TokenManager (not mocked) combined with a mocked
 * Privy getAccessToken, and exercise the full auth flow through fetchData
 * and createAuthenticatedApiClient.
 *
 * Covers:
 * - Expired token -> fetchData -> interceptor refreshes -> retry succeeds
 * - Deduplication during in-flight refresh
 * - Multiple fetchData calls waiting for a single refresh
 * - fetchData after explicit clearCache
 * - Server-side fetchData using getServerToken path
 */

import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We need to mock axios.request for fetchData, and use real TokenManager
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { TokenManager } from "@/utilities/auth/token-manager";
import fetchData from "@/utilities/fetchData";

describe("Integration: token refresh flow", () => {
  let mockGetAccessToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockGetAccessToken = vi.fn().mockResolvedValue("initial-token");
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
  // fetchData token injection
  // =========================================================================

  describe("fetchData with TokenManager", () => {
    it("should include Bearer token in fetchData request", async () => {
      const requestSpy = vi.spyOn(axios, "request").mockResolvedValueOnce({
        data: { items: [] },
        status: 200,
      });

      const [data, error] = await fetchData("/test-endpoint");

      expect(error).toBeNull();
      expect(data).toEqual({ items: [] });

      const sentConfig = requestSpy.mock.calls[0][0];
      expect(sentConfig.headers.Authorization).toBe("Bearer initial-token");

      requestSpy.mockRestore();
    });

    it("should skip Authorization header when isAuthorized is false", async () => {
      const requestSpy = vi.spyOn(axios, "request").mockResolvedValueOnce({
        data: { public: true },
        status: 200,
      });

      const [data] = await fetchData(
        "/public-endpoint",
        "GET",
        {},
        {},
        {},
        false // isAuthorized = false
      );

      expect(data).toEqual({ public: true });
      const sentConfig = requestSpy.mock.calls[0][0];
      expect(sentConfig.headers.Authorization).toBeUndefined();

      requestSpy.mockRestore();
    });

    it("should use fresh token after cache expires", async () => {
      const requestSpy = vi.spyOn(axios, "request").mockResolvedValue({
        data: { ok: true },
        status: 200,
      });

      // First call — uses initial token
      await fetchData("/first");
      expect(requestSpy.mock.calls[0][0].headers.Authorization).toBe("Bearer initial-token");

      // Expire cache
      vi.advanceTimersByTime(21_000);
      mockGetAccessToken.mockResolvedValueOnce("refreshed-token");

      // Second call — should fetch fresh token
      await fetchData("/second");
      expect(requestSpy.mock.calls[1][0].headers.Authorization).toBe("Bearer refreshed-token");
      expect(mockGetAccessToken).toHaveBeenCalledTimes(2);

      requestSpy.mockRestore();
    });
  });

  // =========================================================================
  // api-client 401 retry with real TokenManager
  // =========================================================================

  describe("api-client 401 retry with real TokenManager", () => {
    it("should refresh token and retry on 401", async () => {
      const client = createAuthenticatedApiClient("https://api.test");

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        if (callCount === 1) {
          throw new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, {}, {
            status: 401,
            data: {},
            headers: {},
            statusText: "Unauthorized",
            config,
          } as any);
        }
        return { data: { retried: true }, status: 200, headers: {}, statusText: "OK", config };
      };

      // After clearCache (triggered by 401), the next getToken call will fetch fresh
      mockGetAccessToken
        .mockResolvedValueOnce("stale-token") // initial
        .mockResolvedValueOnce("fresh-token"); // after cache clear

      const response = await client.get("/protected");

      expect(response.data).toEqual({ retried: true });
      expect(callCount).toBe(2);
      // getAccessToken called: once for initial, once for retry
      expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // Deduplication during token refresh
  // =========================================================================

  describe("deduplication during in-flight refresh", () => {
    it("should only call getAccessToken once for concurrent fetchData calls", async () => {
      const requestSpy = vi.spyOn(axios, "request").mockResolvedValue({
        data: { ok: true },
        status: 200,
      });

      // All calls happen concurrently — TokenManager should deduplicate
      const results = await Promise.all([fetchData("/a"), fetchData("/b"), fetchData("/c")]);

      for (const [data, error] of results) {
        expect(error).toBeNull();
        expect(data).toEqual({ ok: true });
      }

      // Only 1 getAccessToken call despite 3 concurrent fetchData calls
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);

      requestSpy.mockRestore();
    });

    it("should deduplicate when cache has expired and multiple calls arrive", async () => {
      const requestSpy = vi.spyOn(axios, "request").mockResolvedValue({
        data: {},
        status: 200,
      });

      // Prime cache
      await fetchData("/prime");
      mockGetAccessToken.mockClear();

      // Expire cache
      vi.advanceTimersByTime(21_000);

      mockGetAccessToken.mockResolvedValueOnce("single-refresh");

      // Multiple calls after expiry — should share one refresh
      await Promise.all([fetchData("/x"), fetchData("/y")]);

      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);

      requestSpy.mockRestore();
    });
  });

  // =========================================================================
  // fetchData after explicit clearCache
  // =========================================================================

  describe("fetchData after explicit clearCache", () => {
    it("should get fresh token after clearCache", async () => {
      const requestSpy = vi.spyOn(axios, "request").mockResolvedValue({
        data: { fresh: true },
        status: 200,
      });

      // Prime cache
      await fetchData("/initial");
      mockGetAccessToken.mockClear();
      mockGetAccessToken.mockResolvedValueOnce("post-clear-token");

      // Explicitly clear cache (simulates user-initiated re-auth)
      TokenManager.clearCache();

      await fetchData("/after-clear");

      const sentConfig = requestSpy.mock.calls[1][0];
      expect(sentConfig.headers.Authorization).toBe("Bearer post-clear-token");
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);

      requestSpy.mockRestore();
    });

    it("should handle clearCache when no Privy instance is set", async () => {
      const requestSpy = vi.spyOn(axios, "request").mockResolvedValue({
        data: { noAuth: true },
        status: 200,
      });

      TokenManager.clearCache();
      TokenManager.setPrivyInstance(null);

      const [data, error] = await fetchData("/no-auth");

      // fetchData should still work, just without auth header
      expect(error).toBeNull();
      const sentConfig = requestSpy.mock.calls[0][0];
      expect(sentConfig.headers.Authorization).toBeUndefined();

      requestSpy.mockRestore();
    });
  });

  // =========================================================================
  // Server-side fetchData
  // =========================================================================

  describe("server-side fetchData", () => {
    const originalWindow = globalThis.window;

    beforeEach(() => {
      // @ts-expect-error - remove window to simulate SSR
      delete globalThis.window;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it("should use getServerToken when running server-side", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn((name: string) =>
          name === "privy-token" ? { name: "privy-token", value: "server-side-jwt" } : undefined
        ),
        getAll: vi.fn().mockReturnValue([]),
      } as any);

      const requestSpy = vi.spyOn(axios, "request").mockResolvedValueOnce({
        data: { ssr: true },
        status: 200,
      });

      const [data, error] = await fetchData("/ssr-endpoint");

      expect(error).toBeNull();
      expect(data).toEqual({ ssr: true });

      const sentConfig = requestSpy.mock.calls[0][0];
      expect(sentConfig.headers.Authorization).toBe("Bearer server-side-jwt");

      // Should NOT have called the client-side getAccessToken
      expect(mockGetAccessToken).not.toHaveBeenCalled();

      requestSpy.mockRestore();
    });

    it("should not set Authorization when no server cookie exists", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        getAll: vi.fn().mockReturnValue([]),
      } as any);

      const requestSpy = vi.spyOn(axios, "request").mockResolvedValueOnce({
        data: { noToken: true },
        status: 200,
      });

      const [data, error] = await fetchData("/ssr-no-auth");

      expect(error).toBeNull();
      const sentConfig = requestSpy.mock.calls[0][0];
      expect(sentConfig.headers.Authorization).toBeUndefined();

      requestSpy.mockRestore();
    });
  });
});
