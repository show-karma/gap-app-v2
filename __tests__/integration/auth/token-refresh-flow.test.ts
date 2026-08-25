/**
 * Integration tests: TokenManager + api-client working together
 *
 * These tests use the REAL TokenManager (not mocked) combined with a mocked
 * Privy getAccessToken, and exercise the full 401 refresh-and-retry flow
 * through createAuthenticatedApiClient.
 *
 * The legacy fetchData adapter this file used to also cover was removed in
 * #1775 Phase 4 — its token-injection and deduplication behavior is now
 * exercised against the unified api client in
 * utilities/api/__tests__/client.test.ts (local vi.fn() hooks) and the `api`
 * singleton's own TokenManager wiring (clearCache-then-getToken on 401) in
 * utilities/api/__tests__/client-singleton.test.ts (mocked TokenManager).
 * This file keeps the one case that isn't duplicated there: a 401 retry
 * driven by the *real* TokenManager rather than a mock.
 */

import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { TokenManager } from "@/utilities/auth/token-manager";

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
});
