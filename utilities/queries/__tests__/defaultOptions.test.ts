import { describe, expect, it } from "vitest";
import { defaultQueryOptions } from "../defaultOptions";

const retry = defaultQueryOptions.retry as (failureCount: number, error: unknown) => boolean;

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
