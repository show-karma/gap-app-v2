import { describe, expect, it } from "vitest";
import { isAxiosAbortError, isTransientNetworkError } from "../transientErrors";

describe("isTransientNetworkError", () => {
  it("detects axios Network Error with no response", () => {
    const err = Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it("detects axios timeout (ECONNABORTED)", () => {
    const err = Object.assign(new Error("timeout of 30000ms exceeded"), { code: "ECONNABORTED" });
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it("detects 'Failed to fetch' from native fetch / Safari 'Load failed'", () => {
    expect(isTransientNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isTransientNetworkError(new TypeError("Load failed"))).toBe(true);
  });

  it("treats user-cancelled requests as transient (skip Sentry, but caller decides on retry)", () => {
    const err = Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it("does NOT match errors that carry an HTTP response", () => {
    const err = {
      message: "Request failed with status code 500",
      response: { status: 500, data: { message: "boom" } },
    };
    expect(isTransientNetworkError(err)).toBe(false);
  });

  it("does NOT match unrelated runtime errors", () => {
    expect(isTransientNetworkError(new TypeError("Cannot read property 'x' of undefined"))).toBe(
      false
    );
    expect(isTransientNetworkError(null)).toBe(false);
    expect(isTransientNetworkError(undefined)).toBe(false);
  });
});

describe("isAxiosAbortError", () => {
  it("detects ERR_CANCELED", () => {
    expect(isAxiosAbortError({ code: "ERR_CANCELED", message: "canceled" })).toBe(true);
  });

  it("detects native AbortError by name", () => {
    const err = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(isAxiosAbortError(err)).toBe(true);
  });

  it("does not flag generic network errors", () => {
    expect(isAxiosAbortError({ code: "ERR_NETWORK", message: "Network Error" })).toBe(false);
  });
});
