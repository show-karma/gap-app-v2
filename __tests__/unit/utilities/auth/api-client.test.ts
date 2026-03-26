/**
 * Tests for utilities/auth/api-client.ts
 *
 * Tests the authenticated API client created by createAuthenticatedApiClient:
 * - Request interceptor: Bearer token injection
 * - Response interceptor: 401 retry with fresh token (single retry only)
 * - No infinite retry loop on persistent 401
 */

import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock TokenManager before importing the module under test
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://api.test.local",
  },
}));

import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { TokenManager } from "@/utilities/auth/token-manager";

describe("createAuthenticatedApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Client creation
  // =========================================================================

  describe("client creation", () => {
    it("should create an axios instance with default config", () => {
      const client = createAuthenticatedApiClient();
      expect(client.defaults.baseURL).toBe("https://api.test.local");
      expect(client.defaults.timeout).toBe(30000);
      expect(client.defaults.headers["Content-Type"]).toBe("application/json");
    });

    it("should accept custom baseURL and timeout", () => {
      const client = createAuthenticatedApiClient("https://custom.api", 5000);
      expect(client.defaults.baseURL).toBe("https://custom.api");
      expect(client.defaults.timeout).toBe(5000);
    });
  });

  // =========================================================================
  // Request interceptor - Bearer token injection
  // =========================================================================

  describe("request interceptor - token injection", () => {
    it("should add Bearer token to requests when token is available", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("my-jwt-token");
      const client = createAuthenticatedApiClient("https://api.test.local");

      // Intercept the actual request to inspect headers
      const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, headers: {} });
      client.defaults.adapter = adapter;

      await client.get("/test");

      const requestConfig = adapter.mock.calls[0][0];
      expect(requestConfig.headers.Authorization).toBe("Bearer my-jwt-token");
    });

    it("should not add Authorization header when no token", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue(null);
      const client = createAuthenticatedApiClient("https://api.test.local");

      const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, headers: {} });
      client.defaults.adapter = adapter;

      await client.get("/test");

      const requestConfig = adapter.mock.calls[0][0];
      expect(requestConfig.headers.Authorization).toBeUndefined();
    });

    it("should not double-prefix Bearer if token already has it", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("Bearer already-prefixed");
      const client = createAuthenticatedApiClient("https://api.test.local");

      const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, headers: {} });
      client.defaults.adapter = adapter;

      await client.get("/test");

      const requestConfig = adapter.mock.calls[0][0];
      expect(requestConfig.headers.Authorization).toBe("Bearer already-prefixed");
    });
  });

  // =========================================================================
  // Response interceptor - 401 retry
  // =========================================================================

  describe("response interceptor - 401 retry", () => {
    it("should retry once on 401 with fresh token", async () => {
      vi.mocked(TokenManager.getToken)
        .mockResolvedValueOnce("stale-token") // initial request
        .mockResolvedValueOnce("fresh-token"); // after clearCache + retry

      const client = createAuthenticatedApiClient("https://api.test.local");

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        if (callCount === 1) {
          // First call: simulate 401
          const error = new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, {}, {
            status: 401,
            data: {},
            headers: {},
            statusText: "Unauthorized",
            config,
          } as any);
          throw error;
        }
        // Second call: success
        return { data: { ok: true }, status: 200, headers: {}, statusText: "OK", config };
      };

      const response = await client.get("/protected");
      expect(response.data).toEqual({ ok: true });
      expect(callCount).toBe(2);
      expect(TokenManager.clearCache).toHaveBeenCalledTimes(1);
    });

    it("should NOT retry more than once (prevent infinite loop)", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("always-stale");

      const client = createAuthenticatedApiClient("https://api.test.local");

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        const error = new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, {}, {
          status: 401,
          data: {},
          headers: {},
          statusText: "Unauthorized",
          config,
        } as any);
        throw error;
      };

      await expect(client.get("/protected")).rejects.toThrow();
      // Should have tried twice: original + 1 retry
      expect(callCount).toBe(2);
    });

    it("should reject immediately on 401 when fresh token is null", async () => {
      vi.mocked(TokenManager.getToken)
        .mockResolvedValueOnce("token") // initial request
        .mockResolvedValueOnce(null); // after clearCache, no fresh token

      const client = createAuthenticatedApiClient("https://api.test.local");

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        const error = new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, {}, {
          status: 401,
          data: {},
          headers: {},
          statusText: "Unauthorized",
          config,
        } as any);
        throw error;
      };

      await expect(client.get("/protected")).rejects.toThrow();
      // Only the first call, no retry because fresh token is null
      expect(callCount).toBe(1);
    });

    it("should not retry on non-401 errors", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("token");

      const client = createAuthenticatedApiClient("https://api.test.local");

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        const error = new axios.AxiosError(
          "Internal Server Error",
          "ERR_BAD_RESPONSE",
          config,
          {},
          {
            status: 500,
            data: {},
            headers: {},
            statusText: "Internal Server Error",
            config,
          } as any
        );
        throw error;
      };

      await expect(client.get("/endpoint")).rejects.toThrow();
      expect(callCount).toBe(1);
      expect(TokenManager.clearCache).not.toHaveBeenCalled();
    });

    it("should not retry when error has no response object", async () => {
      vi.mocked(TokenManager.getToken).mockResolvedValue("token");

      const client = createAuthenticatedApiClient("https://api.test.local");

      let callCount = 0;
      client.defaults.adapter = async (config: any) => {
        callCount++;
        throw new axios.AxiosError("Network Error", "ERR_NETWORK", config);
      };

      await expect(client.get("/endpoint")).rejects.toThrow();
      expect(callCount).toBe(1);
    });
  });
});
