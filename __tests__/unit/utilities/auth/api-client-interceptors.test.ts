/**
 * Tests for api-client.ts interceptors (request + response)
 *
 * Covers:
 * - Request interceptor: Bearer token injection, no double-prefix, null token
 * - Response interceptor: 401 retry flow, single-retry guard, null fresh token
 * - Response interceptor: non-401 passthrough, network errors
 * - Concurrent 401 handling: multiple simultaneous failures
 */

import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn(),
    clearCache: vi.fn(),
  },
}));

import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { TokenManager } from "@/utilities/auth/token-manager";

/**
 * Helper: creates a mock adapter that returns 401 on the first N calls
 * then returns success.
 */
function createCountingAdapter(failCount: number) {
  let callCount = 0;
  const adapter = async (config: any) => {
    callCount++;
    if (callCount <= failCount) {
      const error = new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, {}, {
        status: 401,
        data: { message: "Token expired" },
        headers: {},
        statusText: "Unauthorized",
        config,
      } as any);
      throw error;
    }
    return { data: { ok: true }, status: 200, headers: {}, statusText: "OK", config };
  };
  return { adapter, getCallCount: () => callCount };
}

describe("createAuthenticatedApiClient — interceptors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Request interceptor
  // =========================================================================

  describe("request interceptor — token injection", () => {
    it("should add Authorization: Bearer <token> header", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("abc123");
      const client = createAuthenticatedApiClient("https://api.test");

      const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, headers: {} });
      client.defaults.adapter = adapter;

      await client.get("/resource");

      const sentConfig = adapter.mock.calls[0][0];
      expect(sentConfig.headers.Authorization).toBe("Bearer abc123");
    });

    it("should not double-prefix when token already starts with 'Bearer '", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("Bearer already-prefixed");
      const client = createAuthenticatedApiClient("https://api.test");

      const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, headers: {} });
      client.defaults.adapter = adapter;

      await client.get("/resource");

      const sentConfig = adapter.mock.calls[0][0];
      expect(sentConfig.headers.Authorization).toBe("Bearer already-prefixed");
      // Verify it does NOT become "Bearer Bearer already-prefixed"
      expect(sentConfig.headers.Authorization).not.toMatch(/^Bearer Bearer/);
    });

    it("should not set Authorization header when token is null", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue(null);
      const client = createAuthenticatedApiClient("https://api.test");

      const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, headers: {} });
      client.defaults.adapter = adapter;

      await client.get("/public");

      const sentConfig = adapter.mock.calls[0][0];
      expect(sentConfig.headers.Authorization).toBeUndefined();
    });

    it("should not set Authorization header when token is empty string", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("");
      const client = createAuthenticatedApiClient("https://api.test");

      const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, headers: {} });
      client.defaults.adapter = adapter;

      await client.get("/public");

      const sentConfig = adapter.mock.calls[0][0];
      // Empty string is falsy, so no header should be set
      expect(sentConfig.headers.Authorization).toBeUndefined();
    });

    it("should call TokenManager.getToken for each request", async () => {
      vi.mocked(TokenManager.getToken)
        .mockResolvedValueOnce("token-1")
        .mockResolvedValueOnce("token-2");

      const client = createAuthenticatedApiClient("https://api.test");
      const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, headers: {} });
      client.defaults.adapter = adapter;

      await client.get("/first");
      await client.get("/second");

      expect(adapter.mock.calls[0][0].headers.Authorization).toBe("Bearer token-1");
      expect(adapter.mock.calls[1][0].headers.Authorization).toBe("Bearer token-2");
      expect(TokenManager.getToken).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // Response interceptor — 401 retry
  // =========================================================================

  describe("response interceptor — 401 retry", () => {
    it("should clear cache, fetch fresh token, and retry on 401", async () => {
      vi.mocked(TokenManager.getToken)
        .mockResolvedValueOnce("stale") // initial request
        .mockResolvedValueOnce("fresh"); // retry after clearCache

      const { adapter, getCallCount } = createCountingAdapter(1);
      const client = createAuthenticatedApiClient("https://api.test");
      client.defaults.adapter = adapter;

      const response = await client.get("/protected");

      expect(response.data).toEqual({ ok: true });
      expect(getCallCount()).toBe(2);
      expect(TokenManager.clearCache).toHaveBeenCalledTimes(1);
    });

    it("should NOT retry more than once — prevents infinite loop", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("always-bad");

      // All calls return 401
      const { adapter, getCallCount } = createCountingAdapter(100);
      const client = createAuthenticatedApiClient("https://api.test");
      client.defaults.adapter = adapter;

      await expect(client.get("/protected")).rejects.toThrow();
      // Original + 1 retry = 2 calls
      expect(getCallCount()).toBe(2);
    });

    it("should reject immediately when fresh token is null after 401", async () => {
      vi.mocked(TokenManager.getToken)
        .mockResolvedValueOnce("initial-token") // initial request
        .mockResolvedValueOnce(null); // no fresh token available

      const { adapter, getCallCount } = createCountingAdapter(1);
      const client = createAuthenticatedApiClient("https://api.test");
      client.defaults.adapter = adapter;

      await expect(client.get("/protected")).rejects.toThrow();
      // Only 1 call — retry was skipped because fresh token is null
      expect(getCallCount()).toBe(1);
      expect(TokenManager.clearCache).toHaveBeenCalledTimes(1);
    });

    it("should set correct Authorization header on retry request", async () => {
      // Call sequence: request interceptor (1st), 401, response interceptor calls getToken (2nd),
      // then apiClient.request re-triggers request interceptor (3rd)
      vi.mocked(TokenManager.getToken)
        .mockResolvedValueOnce("old-token") // request interceptor — initial
        .mockResolvedValueOnce("new-token") // response interceptor — after clearCache
        .mockResolvedValueOnce("new-token"); // request interceptor — retry

      const client = createAuthenticatedApiClient("https://api.test");
      const headers: string[] = [];

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        headers.push(config.headers?.Authorization);
        if (callCount === 1) {
          throw new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, {}, {
            status: 401,
            data: {},
            headers: {},
            statusText: "Unauthorized",
            config,
          } as any);
        }
        return { data: { ok: true }, status: 200, headers: {}, statusText: "OK", config };
      };

      await client.get("/protected");

      expect(headers[0]).toBe("Bearer old-token");
      // The retry request goes through the request interceptor again,
      // which overwrites the header with the latest getToken() result
      expect(headers[1]).toBe("Bearer new-token");
    });

    it("should handle token that already has Bearer prefix on retry", async () => {
      // 3 getToken calls: initial request interceptor, response interceptor, retry request interceptor
      vi.mocked(TokenManager.getToken)
        .mockResolvedValueOnce("token-a") // request interceptor — initial
        .mockResolvedValueOnce("Bearer prefixed-fresh") // response interceptor — after clearCache
        .mockResolvedValueOnce("Bearer prefixed-fresh"); // request interceptor — retry

      const client = createAuthenticatedApiClient("https://api.test");
      let retryHeader: string | undefined;

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
        retryHeader = config.headers?.Authorization;
        return { data: {}, status: 200, headers: {}, statusText: "OK", config };
      };

      await client.get("/protected");

      // Bearer prefix should not be doubled
      expect(retryHeader).toBe("Bearer prefixed-fresh");
    });
  });

  // =========================================================================
  // Response interceptor — non-401 errors
  // =========================================================================

  describe("response interceptor — non-401 errors", () => {
    it("should pass through 403 errors without retry", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("valid-token");
      const client = createAuthenticatedApiClient("https://api.test");

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        throw new axios.AxiosError("Forbidden", "ERR_BAD_REQUEST", config, {}, {
          status: 403,
          data: { message: "Access denied" },
          headers: {},
          statusText: "Forbidden",
          config,
        } as any);
      };

      await expect(client.get("/admin")).rejects.toThrow("Forbidden");
      expect(callCount).toBe(1);
      expect(TokenManager.clearCache).not.toHaveBeenCalled();
    });

    it("should pass through 500 errors without retry", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("token");
      const client = createAuthenticatedApiClient("https://api.test");

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        throw new axios.AxiosError("Server Error", "ERR_BAD_RESPONSE", config, {}, {
          status: 500,
          data: {},
          headers: {},
          statusText: "Internal Server Error",
          config,
        } as any);
      };

      await expect(client.get("/broken")).rejects.toThrow();
      expect(callCount).toBe(1);
    });

    it("should pass through network errors (no response object)", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("token");
      const client = createAuthenticatedApiClient("https://api.test");

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        throw new axios.AxiosError("Network Error", "ERR_NETWORK", config);
      };

      await expect(client.get("/endpoint")).rejects.toThrow("Network Error");
      expect(callCount).toBe(1);
      expect(TokenManager.clearCache).not.toHaveBeenCalled();
    });

    it("should pass through timeout errors", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("token");
      const client = createAuthenticatedApiClient("https://api.test");

      client.defaults.adapter = async (config: any) => {
        throw new axios.AxiosError("Timeout", "ECONNABORTED", config);
      };

      await expect(client.get("/slow")).rejects.toThrow("Timeout");
      expect(TokenManager.clearCache).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Concurrent 401 handling
  // =========================================================================

  describe("concurrent 401 handling", () => {
    it("should handle multiple requests failing with 401 simultaneously", async () => {
      let tokenCallCount = 0;
      vi.mocked(TokenManager.getToken).mockImplementation(async () => {
        tokenCallCount++;
        // First 3 calls are initial requests, next calls are retries
        if (tokenCallCount <= 3) return "stale-token";
        return "refreshed-token";
      });

      const client = createAuthenticatedApiClient("https://api.test");

      const requestCounts = new Map<string, number>();
      client.defaults.adapter = async (config: any) => {
        const url = config.url || "";
        const count = (requestCounts.get(url) || 0) + 1;
        requestCounts.set(url, count);

        // First attempt for each URL fails with 401
        if (count === 1) {
          throw new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, {}, {
            status: 401,
            data: {},
            headers: {},
            statusText: "Unauthorized",
            config,
          } as any);
        }
        return { data: { url }, status: 200, headers: {}, statusText: "OK", config };
      };

      const results = await Promise.all([client.get("/a"), client.get("/b"), client.get("/c")]);

      // All requests should eventually succeed
      expect(results[0].data).toEqual({ url: "/a" });
      expect(results[1].data).toEqual({ url: "/b" });
      expect(results[2].data).toEqual({ url: "/c" });

      // clearCache should have been called for each 401
      expect(TokenManager.clearCache).toHaveBeenCalledTimes(3);
    });
  });
});
