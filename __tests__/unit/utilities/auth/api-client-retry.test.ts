/**
 * Tests for transient-failure retry in createAuthenticatedApiClient.
 *
 * Covers the resilience added so a brief backend outage (e.g. a redeploy that
 * refuses connections) is bridged transparently instead of surfacing as a hard
 * error to the user:
 * - Network errors and 502/503/504/429 are retried with backoff
 * - Method-aware policy: writes are never replayed when they may have taken effect
 * - Permanent errors (4xx, 500) are not retried
 * - A single, reference-counted "Reconnecting…" toast across concurrent requests
 */

import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import toast from "react-hot-toast";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { TokenManager } from "@/utilities/auth/token-manager";

const FAST_RETRY = {
  retries: 4,
  baseDelayMs: 0,
  maxDelayMs: 0,
  jitter: 0,
  reconnectToastAfterAttempt: Number.POSITIVE_INFINITY,
};

/** Adapter that throws `error` for the first `failCount` calls, then succeeds. */
function failingAdapter(failCount: number, error: (config: any) => unknown) {
  let callCount = 0;
  const adapter = async (config: any) => {
    callCount++;
    if (callCount <= failCount) throw error(config);
    return { data: { ok: true }, status: 200, headers: {}, statusText: "OK", config };
  };
  return { adapter, getCallCount: () => callCount };
}

const networkError = (config: any) => new axios.AxiosError("Network Error", "ERR_NETWORK", config);
const timeoutError = (config: any) => new axios.AxiosError("Timeout", "ECONNABORTED", config);
const statusError = (status: number) => (config: any) =>
  new axios.AxiosError(`HTTP ${status}`, "ERR_BAD_RESPONSE", config, {}, {
    status,
    data: {},
    headers: {},
    statusText: `HTTP ${status}`,
    config,
  } as any);

describe("createAuthenticatedApiClient — transient retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TokenManager.getToken).mockResolvedValue("token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("retries transient failures", () => {
    it("recovers when the backend comes back mid-retry", async () => {
      const { adapter, getCallCount } = failingAdapter(2, networkError);
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      const response = await client.get("/resource");

      expect(response.data).toEqual({ ok: true });
      expect(getCallCount()).toBe(3); // 2 failures + 1 success
    });

    it("gives up after exhausting the retry budget", async () => {
      const { adapter, getCallCount } = failingAdapter(100, networkError);
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      await expect(client.get("/resource")).rejects.toThrow("Network Error");
      expect(getCallCount()).toBe(1 + FAST_RETRY.retries);
    });

    it.each([502, 503, 504, 429])("retries idempotent requests on HTTP %i", async (status) => {
      const { adapter, getCallCount } = failingAdapter(1, statusError(status));
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      await client.get("/resource");
      expect(getCallCount()).toBe(2);
    });
  });

  describe("does not retry permanent errors", () => {
    it.each([400, 403, 404, 500])("passes through HTTP %i without retry", async (status) => {
      const { adapter, getCallCount } = failingAdapter(100, statusError(status));
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      await expect(client.get("/resource")).rejects.toThrow();
      expect(getCallCount()).toBe(1);
    });

    it("does NOT retry a cancelled request (React Query abort)", async () => {
      const { adapter, getCallCount } = failingAdapter(
        100,
        (config: any) => new axios.CanceledError("canceled", "ERR_CANCELED", config)
      );
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      await expect(client.get("/resource")).rejects.toThrow();
      expect(getCallCount()).toBe(1);
    });
  });

  describe("method-aware write safety", () => {
    it("retries a POST that failed at the connection level (never reached the app)", async () => {
      const { adapter, getCallCount } = failingAdapter(1, networkError);
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      await client.post("/resource", { a: 1 });
      expect(getCallCount()).toBe(2);
    });

    it("does NOT retry a POST timeout — the write may have already taken effect", async () => {
      const { adapter, getCallCount } = failingAdapter(100, timeoutError);
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      await expect(client.post("/resource", { a: 1 })).rejects.toThrow("Timeout");
      expect(getCallCount()).toBe(1);
    });

    it("does NOT retry a POST on 502 — the app may have processed it before crashing", async () => {
      const { adapter, getCallCount } = failingAdapter(100, statusError(502));
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      await expect(client.post("/resource", { a: 1 })).rejects.toThrow();
      expect(getCallCount()).toBe(1);
    });

    it("retries a PUT on 502 — idempotent writes are safe to replay", async () => {
      const { adapter, getCallCount } = failingAdapter(1, statusError(502));
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      await client.put("/resource/1", { a: 1 });
      expect(getCallCount()).toBe(2);
    });

    it("retries a POST on 503 — the gateway never delivered it to the app", async () => {
      const { adapter, getCallCount } = failingAdapter(1, statusError(503));
      const client = createAuthenticatedApiClient("https://api.test", 30000, FAST_RETRY);
      client.defaults.adapter = adapter;

      await client.post("/resource", { a: 1 });
      expect(getCallCount()).toBe(2);
    });
  });

  describe("reconnecting toast", () => {
    it("shows once after the threshold and dismisses on recovery", async () => {
      const { adapter } = failingAdapter(2, networkError);
      const client = createAuthenticatedApiClient("https://api.test", 30000, {
        ...FAST_RETRY,
        reconnectToastAfterAttempt: 1,
      });
      client.defaults.adapter = adapter;

      await client.get("/resource");

      expect(toast.loading).toHaveBeenCalledTimes(1);
      expect(toast.dismiss).toHaveBeenCalledTimes(1);
    });

    it("dismisses the toast when retries are finally exhausted", async () => {
      const { adapter } = failingAdapter(100, networkError);
      const client = createAuthenticatedApiClient("https://api.test", 30000, {
        ...FAST_RETRY,
        reconnectToastAfterAttempt: 1,
      });
      client.defaults.adapter = adapter;

      await expect(client.get("/resource")).rejects.toThrow();

      expect(toast.loading).toHaveBeenCalledTimes(1);
      expect(toast.dismiss).toHaveBeenCalledTimes(1);
    });

    it("collapses concurrent stalled requests into a single toast", async () => {
      const client = createAuthenticatedApiClient("https://api.test", 30000, {
        ...FAST_RETRY,
        reconnectToastAfterAttempt: 1,
      });
      const perUrl = new Map<string, number>();
      client.defaults.adapter = async (config: any) => {
        const url = config.url || "";
        const count = (perUrl.get(url) || 0) + 1;
        perUrl.set(url, count);
        if (count === 1) throw networkError(config);
        return { data: { url }, status: 200, headers: {}, statusText: "OK", config };
      };

      await Promise.all([client.get("/a"), client.get("/b"), client.get("/c")]);

      expect(toast.loading).toHaveBeenCalledTimes(1);
      expect(toast.dismiss).toHaveBeenCalledTimes(1);
    });
  });
});
