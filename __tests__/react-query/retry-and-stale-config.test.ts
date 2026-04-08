/**
 * Task 38: React Query retry and stale time configuration tests.
 *
 * These tests verify that the QueryClient's default options are correctly
 * configured. Misconfigured stale times or retry policies cause either
 * excessive API calls or stale data displayed to users.
 */
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  it("does NOT retry 429 rate-limit errors", () => {
    expect(retryFn(0, { response: { status: 429 } })).toBe(false);
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

  it("handles error with status directly on error object", () => {
    expect(retryFn(0, { status: 429 })).toBe(false);
  });

  it("handles null/undefined errors without crashing", () => {
    expect(retryFn(0, null)).toBe(true); // Allows retry for unknown errors
    expect(retryFn(0, undefined)).toBe(true);
    expect(retryFn(1, null)).toBe(false); // But only once
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

  it("rate-limited query is called exactly once (no retry)", async () => {
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

    expect(callCount).toBe(1);
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
