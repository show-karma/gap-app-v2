import { describe, expect, it } from "vitest";
import { HttpError, NetworkError, RequestAborted, TimeoutError } from "@/utilities/api/errors";
import { defaultQueryOptions } from "../defaultOptions";

const retry = defaultQueryOptions.retry as (failureCount: number, error: unknown) => boolean;
const retryDelay = defaultQueryOptions.retryDelay as (attempt: number, error: unknown) => number;

describe("defaultQueryOptions — load-bearing config", () => {
  it("staleTime is 60000ms (1 minute)", () => {
    expect(defaultQueryOptions.staleTime).toBe(60000);
  });

  it("gcTime matches staleTime", () => {
    expect(defaultQueryOptions.gcTime).toBe(defaultQueryOptions.staleTime);
  });

  it("refetchOnWindowFocus is disabled", () => {
    expect(defaultQueryOptions.refetchOnWindowFocus).toBe(false);
  });

  it("refetchOnMount is enabled", () => {
    expect(defaultQueryOptions.refetchOnMount).toBe(true);
  });

  it("refetchOnReconnect is disabled", () => {
    expect(defaultQueryOptions.refetchOnReconnect).toBe(false);
  });
});

describe("defaultQueryOptions.retry", () => {
  it("never retries 401 unauthorized", () => {
    const err = { response: { status: 401 } };
    expect(retry(0, err)).toBe(false);
  });

  it("never retries 429 rate-limit", () => {
    const err = { response: { status: 429 } };
    expect(retry(0, err)).toBe(false);
  });

  it("never retries aborted requests", () => {
    const err = { code: "ERR_CANCELED", message: "canceled" };
    expect(retry(0, err)).toBe(false);
  });

  it("retries transient network errors up to 2 times", () => {
    const err = Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });
    expect(retry(0, err)).toBe(true);
    expect(retry(1, err)).toBe(true);
    expect(retry(2, err)).toBe(false);
  });

  it("retries generic errors once", () => {
    const err = { response: { status: 500 } };
    expect(retry(0, err)).toBe(true);
    expect(retry(1, err)).toBe(false);
  });
});

describe("typed ApiError path", () => {
  it("retries HttpError 429 up to 2 times (retryable per taxonomy)", () => {
    const err = new HttpError(429, { endpoint: "/x", method: "GET" });
    expect(retry(0, err)).toBe(true);
    expect(retry(1, err)).toBe(true);
    expect(retry(2, err)).toBe(false);
  });

  it("does NOT retry HttpError 500 (not retryable per taxonomy)", () => {
    const err = new HttpError(500, { endpoint: "/x", method: "GET" });
    expect(retry(0, err)).toBe(false);
  });

  it("retries HttpError 503 up to 2 times", () => {
    const err = new HttpError(503, { endpoint: "/x", method: "GET" });
    expect(retry(0, err)).toBe(true);
    expect(retry(1, err)).toBe(true);
    expect(retry(2, err)).toBe(false);
  });

  it("retries NetworkError up to 2 times", () => {
    const err = new NetworkError({ endpoint: "/x", method: "GET" });
    expect(retry(0, err)).toBe(true);
    expect(retry(1, err)).toBe(true);
    expect(retry(2, err)).toBe(false);
  });

  it("does NOT retry RequestAborted", () => {
    const err = new RequestAborted({ endpoint: "/x", method: "GET" });
    expect(retry(0, err)).toBe(false);
  });

  it("retries TimeoutError up to 2 times (matches 408's retryable classification, restoring legacy timeout-retry behavior)", () => {
    const err = new TimeoutError({ endpoint: "/x", method: "GET", timeoutMs: 30_000 });
    expect(retry(0, err)).toBe(true);
    expect(retry(1, err)).toBe(true);
    expect(retry(2, err)).toBe(false);
  });

  it("retryDelay honors Retry-After for typed HttpError", () => {
    const err = new HttpError(429, { endpoint: "/x", method: "GET", retryAfterMs: 5000 });
    const delay = retryDelay(0, err);
    expect(delay).toBeGreaterThanOrEqual(5000);
    expect(delay).toBeLessThan(5250);
  });

  it("retryDelay uses the new base formula for a typed error with no Retry-After hint", () => {
    const err = new NetworkError({ endpoint: "/x", method: "GET" });
    const delay = retryDelay(0, err);
    expect(delay).toBeGreaterThanOrEqual(2000);
    expect(delay).toBeLessThan(2250);
  });

  it("retryDelay caps a typed HttpError's Retry-After hint at 30s (Math.min(hint, 30_000))", () => {
    const err = new HttpError(429, { endpoint: "/x", method: "GET", retryAfterMs: 999_000 });
    const delay = retryDelay(0, err);
    expect(delay).toBeGreaterThanOrEqual(30000);
    expect(delay).toBeLessThan(30250);
  });
});

describe("retryDelay — legacy path for untyped errors (production backoff unchanged)", () => {
  it("attempt 0 -> exactly 1000ms", () => {
    expect(retryDelay(0, new Error("boom"))).toBe(1000);
  });

  it("attempt 2 -> 4000ms", () => {
    expect(retryDelay(2, new Error("boom"))).toBe(4000);
  });

  it("attempt 10 -> capped at 5000ms", () => {
    expect(retryDelay(10, new Error("boom"))).toBe(5000);
  });
});
