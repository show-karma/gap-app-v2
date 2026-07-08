import { describe, expect, it } from "vitest";
import { HttpError, NetworkError, RequestAborted } from "@/utilities/api/errors";
import { defaultQueryOptions } from "../defaultOptions";

const retry = defaultQueryOptions.retry as (failureCount: number, error: unknown) => boolean;
const retryDelay = defaultQueryOptions.retryDelay as (attempt: number, error: unknown) => number;

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

  it("retryDelay honors Retry-After for typed HttpError", () => {
    const err = new HttpError(429, { endpoint: "/x", method: "GET", retryAfterMs: 5000 });
    const delay = retryDelay(0, err);
    expect(delay).toBeGreaterThanOrEqual(5000);
    expect(delay).toBeLessThan(5250);
  });

  it("retryDelay falls back to exponential backoff for non-typed errors", () => {
    const delay = retryDelay(0, new Error("boom"));
    expect(delay).toBeGreaterThanOrEqual(2000);
    expect(delay).toBeLessThan(2250);
  });
});
