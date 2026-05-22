import {
  isAxiosAbortError,
  isTransientNetworkError,
} from "../../../../utilities/sentry/transientErrors";

describe("isTransientNetworkError", () => {
  it("suppresses the Privy 'Failed to fetch (auth.privy.io)' signature (DEV-264)", () => {
    // The Privy SDK bootstrap fires a fetch to auth.privy.io. When the browser
    // never gets a usable response (offline, DNS, TLS reset, ad-blocker /
    // privacy extension blocking the host), it rejects with a bare
    // `TypeError: Failed to fetch`. Sentry annotates the title with the host
    // (`(auth.privy.io)`) but the underlying message is just "Failed to fetch".
    // This is unactionable third-party noise and must be dropped in beforeSend.
    expect(isTransientNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("matches the 'failed to fetch' message regardless of casing", () => {
    expect(isTransientNetworkError(new Error("failed to fetch"))).toBe(true);
    expect(isTransientNetworkError(new Error("FAILED TO FETCH"))).toBe(true);
  });

  it("matches other transient browser fetch failures", () => {
    expect(isTransientNetworkError(new Error("Network Error"))).toBe(true);
    expect(isTransientNetworkError(new Error("Load failed"))).toBe(true);
  });

  it("matches transient axios error codes without an HTTP response", () => {
    expect(isTransientNetworkError({ code: "ERR_NETWORK" })).toBe(true);
    expect(isTransientNetworkError({ code: "ETIMEDOUT" })).toBe(true);
  });

  it("does NOT suppress real HTTP errors that carry a response", () => {
    // A 500 with "Failed to fetch" text still has an HTTP response attached —
    // that IS actionable and must reach Sentry.
    expect(isTransientNetworkError({ message: "Failed to fetch", response: { status: 500 } })).toBe(
      false
    );
  });

  it("does not over-match unrelated errors", () => {
    expect(isTransientNetworkError(new Error("Something else broke"))).toBe(false);
    expect(isTransientNetworkError(null)).toBe(false);
    expect(isTransientNetworkError(undefined)).toBe(false);
  });

  it("treats cancellations as transient (abort during navigation/unmount)", () => {
    expect(isAxiosAbortError({ code: "ERR_CANCELED" })).toBe(true);
    expect(isTransientNetworkError({ name: "AbortError" })).toBe(true);
  });
});
