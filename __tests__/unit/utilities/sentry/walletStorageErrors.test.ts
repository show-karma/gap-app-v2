import { isIndexedDbInternalError } from "../../../../utilities/sentry/walletStorageErrors";

describe("isIndexedDbInternalError", () => {
  it("suppresses the wallet-SDK IndexedDB 'UnknownError: Internal error.' signature (GAP-FRONTEND-WS)", () => {
    // WalletConnect's keyvaluestorage (and other idb-keyval consumers) leak an
    // un-awaited IndexedDB read rejection during startup when the browser's IDB
    // store is corrupted/unavailable. Chrome surfaces it as a DOMException with
    // name "UnknownError" and message "Internal error." — environmental noise.
    const domException = { name: "UnknownError", message: "Internal error.", code: 0 };
    expect(isIndexedDbInternalError(domException)).toBe(true);
  });

  it("matches a real DOMException instance when available", () => {
    // jsdom provides DOMException; guard so the test is a no-op where it isn't.
    if (typeof DOMException === "undefined") return;
    const err = new DOMException("Internal error.", "UnknownError");
    expect(isIndexedDbInternalError(err)).toBe(true);
  });

  it("matches regardless of message casing or trailing punctuation", () => {
    expect(isIndexedDbInternalError({ name: "UnknownError", message: "internal error" })).toBe(
      true
    );
    expect(isIndexedDbInternalError({ name: "UnknownError", message: "INTERNAL ERROR." })).toBe(
      true
    );
  });

  it("does NOT match an UnknownError with an unrelated message", () => {
    // Stay scoped to the observed IndexedDB signature — a generic UnknownError
    // from elsewhere is still actionable and must reach Sentry.
    expect(isIndexedDbInternalError({ name: "UnknownError", message: "something else" })).toBe(
      false
    );
  });

  it("does NOT match an 'Internal error.' message from a different error name", () => {
    expect(isIndexedDbInternalError({ name: "TypeError", message: "Internal error." })).toBe(false);
    expect(isIndexedDbInternalError(new Error("Internal error."))).toBe(false);
  });

  it("does not over-match unrelated or empty values", () => {
    expect(isIndexedDbInternalError(new Error("Something else broke"))).toBe(false);
    expect(isIndexedDbInternalError(null)).toBe(false);
    expect(isIndexedDbInternalError(undefined)).toBe(false);
    expect(isIndexedDbInternalError("Internal error.")).toBe(false);
  });
});
