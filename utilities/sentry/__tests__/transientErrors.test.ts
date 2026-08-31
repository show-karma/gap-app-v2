import { describe, expect, it } from "vitest";
import {
  isAxiosAbortError,
  isRetryableIdempotentFetchError,
  isTransientHttpError,
  isTransientNetworkError,
  isTransientSocketError,
  isTransientWalletTimeoutError,
} from "../transientErrors";

// The exact server-side signature behind GAP-FRONTEND-1Y9 — a TLS handshake
// reset with no error code attached.
const TLS_HANDSHAKE_MESSAGE =
  "Client network socket disconnected before secure TLS connection was established";

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

describe("isTransientHttpError", () => {
  it("detects an axios 504 by response.status", () => {
    const err = {
      message: "Request failed with status code 504",
      response: { status: 504, data: {} },
    };
    expect(isTransientHttpError(err)).toBe(true);
  });

  it("detects the re-thrown SSR error by its axios message (no response attached)", () => {
    // This is the exact DEV-271 shape: getGrantPrograms re-throws
    // `new Error("Request failed with status code 504")`, which Next captures
    // with no `.response`.
    expect(isTransientHttpError(new Error("Request failed with status code 504"))).toBe(true);
    expect(isTransientHttpError("Request failed with status code 504")).toBe(true);
  });

  it("detects the rest of the transient gateway family (502/503/408)", () => {
    expect(isTransientHttpError({ status: 502 })).toBe(true);
    expect(isTransientHttpError({ response: { status: 503 } })).toBe(true);
    expect(isTransientHttpError(new Error("Request failed with status code 408"))).toBe(true);
  });

  it("does NOT match non-transient HTTP failures (4xx/5xx that are real bugs)", () => {
    expect(isTransientHttpError({ response: { status: 500 } })).toBe(false);
    expect(isTransientHttpError(new Error("Request failed with status code 400"))).toBe(false);
    expect(isTransientHttpError({ response: { status: 404 } })).toBe(false);
  });

  it("does NOT match non-HTTP errors", () => {
    expect(isTransientHttpError(new TypeError("Cannot read property 'x' of undefined"))).toBe(
      false
    );
    expect(isTransientHttpError(null)).toBe(false);
    expect(isTransientHttpError(undefined)).toBe(false);
  });
});

describe("isTransientWalletTimeoutError", () => {
  it("detects the ethers 'could not coalesce error' wrapping a Wallet timeout", () => {
    const err = new Error(
      'could not coalesce error (error={ "message": "Wallet timeout" }, payload={ "method": "eth_sendTransaction" }, code=UNKNOWN_ERROR, version=6.11.0)'
    );
    expect(isTransientWalletTimeoutError(err)).toBe(true);
  });

  it("detects a bare 'Wallet timeout' message", () => {
    expect(isTransientWalletTimeoutError(new Error("Wallet timeout"))).toBe(true);
    expect(isTransientWalletTimeoutError({ message: "wallet timeout" })).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isTransientWalletTimeoutError(new Error("Could Not Coalesce Error"))).toBe(true);
  });

  it("does NOT match unrelated errors", () => {
    expect(isTransientWalletTimeoutError(new Error("Validation failed"))).toBe(false);
    expect(isTransientWalletTimeoutError(new Error("Request failed with status code 500"))).toBe(
      false
    );
    expect(isTransientWalletTimeoutError(null)).toBe(false);
    expect(isTransientWalletTimeoutError(undefined)).toBe(false);
    expect(isTransientWalletTimeoutError(new Error(""))).toBe(false);
  });

  it("does NOT match the exhausted-retry wrapper (so it still reports to Sentry)", () => {
    // Worded as "wallet/bundler timeout", which must not contain "wallet timeout".
    const exhausted = new Error(
      "Project attestation failed after 3 attempts due to a persistent wallet/bundler timeout. Please try again in a moment."
    );
    expect(isTransientWalletTimeoutError(exhausted)).toBe(false);
  });

  // GAP-FRONTEND-23J. ethers emits "could not coalesce error" for ANY provider
  // error it cannot classify — including a duelling-wallet-extension stack
  // overflow, which is permanent and loses the user's work. Dropping that as a
  // "transient timeout" would leave the failure with zero telemetry, since
  // browserExtensionErrors already filters the extensions' own crashes.
  it("does NOT match a wallet-provider conflict wearing the same ethers wrapper", () => {
    const coalesce = Object.assign(
      new Error(
        'could not coalesce error (error={ "message": "Unknown connector error" }, payload={ "method": "eth_sendTransaction" })'
      ),
      { code: "UNKNOWN_ERROR", error: new RangeError("Maximum call stack size exceeded") }
    );
    expect(isTransientWalletTimeoutError(coalesce)).toBe(false);
  });

  // Regression guard for a trap this filter sets for a FUTURE change. The SDK
  // wrapper's message is the constant "Error during attestation." today, so it
  // does not match the fragments by accident. The moment karma-gap-sdk carries
  // the underlying cause into that message — a change worth making, because the
  // constant is what makes every attestation failure group together — every
  // wrapped failure would start matching and be silently dropped. The exclusion
  // is structural so the SDK's wording can never change our filtering.
  it("does NOT match a karma-gap-sdk attestation wrapper, whatever its message says", () => {
    const todaysWrapper = Object.assign(new Error("ATTEST_ERROR: Error during attestation."), {
      code: 50012,
      originalError: new Error("could not coalesce error"),
    });
    const wrapperCarryingTheCause = Object.assign(
      new Error("ATTEST_ERROR: Error during attestation: could not coalesce error"),
      { code: 50012, originalError: new Error("could not coalesce error") }
    );

    expect(isTransientWalletTimeoutError(todaysWrapper)).toBe(false);
    expect(isTransientWalletTimeoutError(wrapperCarryingTheCause)).toBe(false);
  });

  it("still matches the raw unwrapped ethers signature it exists for", () => {
    // An un-awaited rejection from an abandoned attempt: plain ethers, string
    // `code`, no `originalError`. Neither exclusion applies.
    const raw = Object.assign(
      new Error('could not coalesce error (error={ "message": "Wallet timeout" })'),
      { code: "UNKNOWN_ERROR" }
    );
    expect(isTransientWalletTimeoutError(raw)).toBe(true);
  });
});

describe("isTransientSocketError (GAP-FRONTEND-1Y9)", () => {
  it("detects a Node ECONNRESET with no HTTP response", () => {
    const err = Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });
    expect(isTransientSocketError(err)).toBe(true);
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it("detects a bare 'socket hang up'", () => {
    const err = Object.assign(new Error("socket hang up"), { code: "ECONNRESET" });
    expect(isTransientSocketError(err)).toBe(true);
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it("detects the exact TLS-handshake reset message even with no code", () => {
    const err = new Error(TLS_HANDSHAKE_MESSAGE);
    expect(isTransientSocketError(err)).toBe(true);
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it("walks error.cause one level for undici's 'fetch failed' wrapper", () => {
    const err = new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
    expect(isTransientSocketError(err)).toBe(true);
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it("detects the other undici/socket codes", () => {
    for (const code of [
      "EPIPE",
      "EAI_AGAIN",
      "ECONNREFUSED",
      "UND_ERR_SOCKET",
      "UND_ERR_CONNECT_TIMEOUT",
    ]) {
      expect(isTransientSocketError({ code, message: code })).toBe(true);
    }
  });

  it("does NOT match a socket code that carries an HTTP response", () => {
    expect(isTransientSocketError({ code: "ECONNRESET", response: { status: 500 } })).toBe(false);
  });

  it("does NOT match unrelated errors", () => {
    expect(isTransientSocketError({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND" })).toBe(
      false
    );
    expect(isTransientSocketError(new TypeError("Cannot read property 'x' of undefined"))).toBe(
      false
    );
    expect(isTransientSocketError(null)).toBe(false);
  });
});

describe("isRetryableIdempotentFetchError (GAP-FRONTEND-1Y9)", () => {
  it("retries transient socket resets with no HTTP response", () => {
    expect(
      isRetryableIdempotentFetchError(
        Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" })
      )
    ).toBe(true);
    expect(isRetryableIdempotentFetchError(new Error("socket hang up"))).toBe(true);
    expect(isRetryableIdempotentFetchError(new Error(TLS_HANDSHAKE_MESSAGE))).toBe(true);
    expect(
      isRetryableIdempotentFetchError(
        new TypeError("fetch failed", { cause: { code: "ECONNRESET" } })
      )
    ).toBe(true);
  });

  it("retries the transient upstream gateway family (502/503/504/408)", () => {
    expect(isRetryableIdempotentFetchError({ response: { status: 502 } })).toBe(true);
    expect(isRetryableIdempotentFetchError({ response: { status: 503 } })).toBe(true);
    expect(isRetryableIdempotentFetchError({ response: { status: 504 } })).toBe(true);
    expect(isRetryableIdempotentFetchError({ response: { status: 408 } })).toBe(true);
    expect(isRetryableIdempotentFetchError(new Error("Request failed with status code 504"))).toBe(
      true
    );
  });

  it("does NOT retry axios timeout codes (no server budget for a 360s retry)", () => {
    const econnaborted = Object.assign(new Error("timeout of 360000ms exceeded"), {
      code: "ECONNABORTED",
    });
    const etimedout = Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
    expect(isTransientNetworkError(econnaborted)).toBe(true);
    expect(isRetryableIdempotentFetchError(econnaborted)).toBe(false);
    expect(isTransientNetworkError(etimedout)).toBe(true);
    expect(isRetryableIdempotentFetchError(etimedout)).toBe(false);
  });

  it("does NOT retry aborts, 400/401/429, or arbitrary errors", () => {
    expect(isRetryableIdempotentFetchError({ code: "ERR_CANCELED", message: "canceled" })).toBe(
      false
    );
    expect(isRetryableIdempotentFetchError({ response: { status: 400 } })).toBe(false);
    expect(isRetryableIdempotentFetchError({ response: { status: 401 } })).toBe(false);
    expect(isRetryableIdempotentFetchError({ response: { status: 429 } })).toBe(false);
    expect(
      isRetryableIdempotentFetchError({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND" })
    ).toBe(false);
    expect(isRetryableIdempotentFetchError(new TypeError("boom"))).toBe(false);
    expect(isRetryableIdempotentFetchError(null)).toBe(false);
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
