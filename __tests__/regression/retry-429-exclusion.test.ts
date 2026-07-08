/**
 * Regression test for the 429 retry policy.
 *
 * History: defaultQueryOptions originally used `retry: 1` (a number), which
 * blindly retried ALL failures including 429s. That was first fixed by never
 * retrying 429; GAP-FRONTEND-245 then showed that "never retry" surfaces
 * errors for what is expected load-shedding under the indexer's per-route
 * rate limit. The current contract is a BOUNDED retry: up to 2 retries with
 * capped backoff (honoring Retry-After when present), never unbounded.
 *
 * This suite guards both edges: 429s are retried at most twice (3 calls
 * total), and 401s are never retried.
 */

import { QueryClient } from "@tanstack/react-query";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

describe("Regression: 429 rate-limited responses use a bounded retry (max 2)", () => {
  it("retry is a function, not a static number", () => {
    expect(typeof defaultQueryOptions.retry).toBe("function");
  });

  it("retry function allows up to 2 retries for 429 errors, then stops", () => {
    const retryFn = defaultQueryOptions.retry as (failureCount: number, error: unknown) => boolean;
    const rateLimitError = { response: { status: 429 } };

    expect(retryFn(0, rateLimitError)).toBe(true);
    expect(retryFn(1, rateLimitError)).toBe(true);
    expect(retryFn(2, rateLimitError)).toBe(false);
  });

  it("retry function returns false for 401 errors", () => {
    const retryFn = defaultQueryOptions.retry as (failureCount: number, error: unknown) => boolean;
    const authError = { response: { status: 401 } };

    expect(retryFn(0, authError)).toBe(false);
  });

  it("retry function allows one retry for 500 errors", () => {
    const retryFn = defaultQueryOptions.retry as (failureCount: number, error: unknown) => boolean;
    const serverError = { response: { status: 500 } };

    expect(retryFn(0, serverError)).toBe(true); // First retry allowed
    expect(retryFn(1, serverError)).toBe(false); // Second retry blocked
  });

  it("retry function allows one retry for generic errors", () => {
    const retryFn = defaultQueryOptions.retry as (failureCount: number, error: unknown) => boolean;
    const genericError = new Error("Network timeout");

    expect(retryFn(0, genericError)).toBe(true);
    expect(retryFn(1, genericError)).toBe(false);
  });

  it("429 error causes exactly three calls (initial + 2 retries) in QueryClient", async () => {
    let callCount = 0;

    const testClient = new QueryClient({
      defaultOptions: {
        queries: {
          ...defaultQueryOptions,
          retryDelay: 0, // no delay for test speed
        },
      },
    });

    try {
      await testClient.fetchQuery({
        queryKey: ["regression-429-test"],
        queryFn: async () => {
          callCount++;
          const err: Error & { response?: { status: number } } = new Error("Rate limited");
          err.response = { status: 429 };
          throw err;
        },
      });
    } catch {
      // Expected to throw
    }

    // Bounded retry: initial call + 2 retries, never more.
    expect(callCount).toBe(3);

    testClient.clear();
  });

  it("500 error causes two calls (initial + 1 retry) in QueryClient", async () => {
    let callCount = 0;

    const testClient = new QueryClient({
      defaultOptions: {
        queries: {
          ...defaultQueryOptions,
          retryDelay: 0, // no delay for test speed
        },
      },
    });

    try {
      await testClient.fetchQuery({
        queryKey: ["regression-500-test"],
        queryFn: async () => {
          callCount++;
          const err: Error & { response?: { status: number } } = new Error("Server error");
          err.response = { status: 500 };
          throw err;
        },
      });
    } catch {
      // Expected to throw
    }

    // 500 should be retried once -- 2 calls total
    expect(callCount).toBe(2);

    testClient.clear();
  });
});
