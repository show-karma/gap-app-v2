/**
 * Regression test for Bug #2: 429 responses retried by React Query
 *
 * Previously, defaultQueryOptions used `retry: 1` (a number), which retried
 * ALL failed requests including 429 rate-limited responses. This caused
 * unnecessary load on rate-limited endpoints.
 *
 * Fixed by replacing `retry: 1` with a function that skips retries for
 * 429 (rate limited) and 401 (unauthorized) responses.
 */

import { QueryClient } from "@tanstack/react-query";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

describe("Regression: 429 rate-limited responses should not be retried", () => {
  it("retry is a function, not a static number", () => {
    expect(typeof defaultQueryOptions.retry).toBe("function");
  });

  it("retry function returns false for 429 errors", () => {
    const retryFn = defaultQueryOptions.retry as (failureCount: number, error: unknown) => boolean;
    const rateLimitError = { response: { status: 429 } };

    expect(retryFn(0, rateLimitError)).toBe(false);
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

  it("429 error causes only one call (no retry) in QueryClient", async () => {
    let callCount = 0;

    const testClient = new QueryClient({
      defaultOptions: {
        queries: defaultQueryOptions,
      },
    });

    try {
      await testClient.fetchQuery({
        queryKey: ["regression-429-test"],
        queryFn: async () => {
          callCount++;
          const err = new Error("Rate limited") as any;
          err.response = { status: 429 };
          throw err;
        },
      });
    } catch {
      // Expected to throw
    }

    // With the fix, 429 should NOT be retried -- only 1 call
    expect(callCount).toBe(1);

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
          const err = new Error("Server error") as any;
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
