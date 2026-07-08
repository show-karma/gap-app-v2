/**
 * Task 38: React Query retry and stale time configuration tests.
 *
 * These tests verify that the QueryClient's default options are correctly
 * configured. Misconfigured stale times or retry policies cause either
 * excessive API calls or stale data displayed to users.
 */
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FetchDataError } from "@/utilities/fetchData";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

describe("defaultQueryOptions — configuration correctness", () => {
  it("staleTime is set to 1 minute", () => {
    expect(defaultQueryOptions.staleTime).toBe(60_000);
  });

  it("gcTime matches staleTime for efficient garbage collection", () => {
    expect(defaultQueryOptions.gcTime).toBe(defaultQueryOptions.staleTime);
  });

  it("refetchOnWindowFocus is disabled to prevent unnecessary requests", () => {
    expect(defaultQueryOptions.refetchOnWindowFocus).toBe(false);
  });

  it("refetchOnMount is enabled to ensure fresh data on navigation", () => {
    expect(defaultQueryOptions.refetchOnMount).toBe(true);
  });

  it("refetchOnReconnect is disabled", () => {
    expect(defaultQueryOptions.refetchOnReconnect).toBe(false);
  });

  it("retry is a function, not a static number", () => {
    expect(typeof defaultQueryOptions.retry).toBe("function");
  });
});

describe("defaultQueryOptions.retry — error classification", () => {
  const retryFn = defaultQueryOptions.retry as (failureCount: number, error: unknown) => boolean;

  it("retries 429 rate-limit errors up to twice", () => {
    expect(retryFn(0, { response: { status: 429 } })).toBe(true);
    expect(retryFn(1, { response: { status: 429 } })).toBe(true);
    expect(retryFn(2, { response: { status: 429 } })).toBe(false);
  });

  it("retries a FetchDataError(429) up to twice via its status field", () => {
    const err = new FetchDataError("Rate limit exceeded. Try again later.", 429);
    expect(retryFn(0, err)).toBe(true);
    expect(retryFn(1, err)).toBe(true);
    expect(retryFn(2, err)).toBe(false);
  });

  it("does NOT retry 401 unauthorized errors", () => {
    expect(retryFn(0, { response: { status: 401 } })).toBe(false);
  });

  it("retries 500 errors once", () => {
    expect(retryFn(0, { response: { status: 500 } })).toBe(true);
    expect(retryFn(1, { response: { status: 500 } })).toBe(false);
  });

  it("retries 502 bad gateway once", () => {
    expect(retryFn(0, { response: { status: 502 } })).toBe(true);
    expect(retryFn(1, { response: { status: 502 } })).toBe(false);
  });

  it("retries 503 service unavailable once", () => {
    expect(retryFn(0, { response: { status: 503 } })).toBe(true);
    expect(retryFn(1, { response: { status: 503 } })).toBe(false);
  });

  it("retries generic network errors once", () => {
    expect(retryFn(0, new Error("fetch failed"))).toBe(true);
    expect(retryFn(1, new Error("fetch failed"))).toBe(false);
  });

  it("handles a rate-limit status directly on the error object (retries)", () => {
    expect(retryFn(0, { status: 429 })).toBe(true);
    expect(retryFn(2, { status: 429 })).toBe(false);
  });

  it("handles null/undefined errors without crashing", () => {
    expect(retryFn(0, null)).toBe(true); // Allows retry for unknown errors
    expect(retryFn(0, undefined)).toBe(true);
    expect(retryFn(1, null)).toBe(false); // But only once
  });
});

describe("defaultQueryOptions.retryDelay — backoff schedule", () => {
  const retryDelayFn = defaultQueryOptions.retryDelay as (
    attemptIndex: number,
    error: unknown
  ) => number;

  it("honors a server Retry-After hint (error.retryAfterMs)", () => {
    const err = new FetchDataError("Rate limited", 429, 5_000);
    const delay = retryDelayFn(0, err);
    // 5s hint + up to 250ms jitter.
    expect(delay).toBeGreaterThanOrEqual(5_000);
    expect(delay).toBeLessThanOrEqual(5_250);
  });

  it("caps the Retry-After hint at 30s", () => {
    const err = new FetchDataError("Rate limited", 429, 120_000);
    expect(retryDelayFn(0, err)).toBeLessThanOrEqual(30_000);
  });

  it("falls back to exponential backoff capped at 30s when no hint", () => {
    // 2000 * 2^attempt: 2s, 4s, 8s ... capped at 30s (+jitter, still <= 30s cap).
    expect(retryDelayFn(0, new Error("x"))).toBeGreaterThanOrEqual(2_000);
    expect(retryDelayFn(0, new Error("x"))).toBeLessThanOrEqual(30_000);
    expect(retryDelayFn(10, new Error("x"))).toBeLessThanOrEqual(30_000);
  });
});

describe("QueryClient integration — retry behavior", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          ...defaultQueryOptions,
          retryDelay: 0, // No delay for test speed
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("rate-limited query is retried up to twice (initial + 2 retries)", async () => {
    let callCount = 0;

    try {
      await queryClient.fetchQuery({
        queryKey: ["rate-limit-test"],
        queryFn: async () => {
          callCount++;
          const err = new Error("Rate limited") as Error & { response?: { status: number } };
          err.response = { status: 429 };
          throw err;
        },
      });
    } catch {
      // Expected
    }

    expect(callCount).toBe(3);
  });

  it("rate-limited query that recovers on retry resolves silently", async () => {
    let callCount = 0;

    const result = await queryClient.fetchQuery({
      queryKey: ["rate-limit-recovery-test"],
      queryFn: async () => {
        callCount++;
        if (callCount < 2) {
          const err = new FetchDataError("Rate limit exceeded. Try again later.", 429);
          throw err;
        }
        return { data: "recovered" };
      },
    });

    expect(callCount).toBe(2);
    expect(result).toEqual({ data: "recovered" });
  });

  it("server error query is called exactly twice (initial + 1 retry)", async () => {
    let callCount = 0;

    try {
      await queryClient.fetchQuery({
        queryKey: ["server-error-test"],
        queryFn: async () => {
          callCount++;
          const err = new Error("Server error") as Error & { response?: { status: number } };
          err.response = { status: 500 };
          throw err;
        },
      });
    } catch {
      // Expected
    }

    expect(callCount).toBe(2);
  });

  it("successful query after initial failure does not retry further", async () => {
    let callCount = 0;

    const result = await queryClient.fetchQuery({
      queryKey: ["recover-test"],
      queryFn: async () => {
        callCount++;
        if (callCount === 1) {
          const err = new Error("Temporary failure") as Error & { response?: { status: number } };
          err.response = { status: 500 };
          throw err;
        }
        return { data: "recovered" };
      },
    });

    expect(callCount).toBe(2); // Initial fail + successful retry
    expect(result).toEqual({ data: "recovered" });
  });
});
