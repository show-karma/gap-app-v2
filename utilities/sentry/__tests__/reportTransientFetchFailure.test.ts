import type { ErrorEvent } from "@sentry/nextjs";
import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
// Same module instance as the aliased "@sentry/nextjs" import above (vitest
// resolves both specifiers to this file), but typed — exposes the `__scope`
// spy without an `as any` reach-in.
import { __scope as sentryScope } from "@/__mocks__/@sentry/nextjs";
import { sentryIgnoreErrors } from "../ignoreErrors";
import { reportTransientFetchFailure } from "../reportTransientFetchFailure";

describe("reportTransientFetchFailure (GAP-FRONTEND-1Y9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures a warning fingerprinted by the error's code with endpoint in extras", () => {
    reportTransientFetchFailure({
      endpoint: "/grants",
      method: "GET",
      attempts: 3,
      error: Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }),
    });

    expect(sentryScope.setLevel).toHaveBeenCalledWith("warning");
    expect(sentryScope.setFingerprint).toHaveBeenCalledWith([
      "transient-fetch-retries-exhausted",
      "ECONNRESET",
    ]);
    expect(sentryScope.setTags).toHaveBeenCalledWith({
      "transient.fetch": "true",
      "error.code": "ECONNRESET",
      "http.method": "GET",
    });
    expect(sentryScope.setExtras).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "/grants", attempts: 3 })
    );
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Indexer request failed after 3 attempts (ECONNRESET)"
    );
  });

  it("walks error.cause so undici 'fetch failed' wrappers fingerprint by their socket code", () => {
    reportTransientFetchFailure({
      endpoint: "/grants",
      method: "GET",
      attempts: 3,
      error: new TypeError("fetch failed", { cause: { code: "UND_ERR_SOCKET" } }),
    });

    expect(sentryScope.setFingerprint).toHaveBeenCalledWith([
      "transient-fetch-retries-exhausted",
      "UND_ERR_SOCKET",
    ]);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Indexer request failed after 3 attempts (UND_ERR_SOCKET)"
    );
  });

  it("falls back to 'unknown' when neither the error nor its cause carries a code", () => {
    reportTransientFetchFailure({
      endpoint: "/grants",
      method: "GET",
      attempts: 3,
      error: new Error(
        "Client network socket disconnected before secure TLS connection was established"
      ),
    });

    expect(sentryScope.setFingerprint).toHaveBeenCalledWith([
      "transient-fetch-retries-exhausted",
      "unknown",
    ]);
  });

  it("survives the REAL server beforeSend filter (warning is not dropped as transient)", async () => {
    // Importing the server config runs the mocked `Sentry.init` with the real
    // options object, so we can pull out the actual beforeSend hook.
    await import("../../../sentry.server.config");
    const initOptions = vi.mocked(Sentry.init).mock.calls.at(-1)?.[0];
    const beforeSend = initOptions?.beforeSend;
    expect(typeof beforeSend).toBe("function");
    if (typeof beforeSend !== "function") return;

    // For `captureMessage`, Sentry sets `hint.originalException` to the
    // message STRING — the hook still runs. The warning survives only because
    // this exact text matches no transient fragment (and, defense in depth,
    // no `ignoreErrors` pattern) — pin both here so a future fragment/pattern
    // addition can't silently swallow the exhaustion signal.
    const message = "Indexer request failed after 3 attempts (ECONNRESET)";
    const event = { message } as ErrorEvent;
    const result = await beforeSend(event, { originalException: message });
    expect(result).toBe(event);

    for (const pattern of sentryIgnoreErrors) {
      const matches =
        typeof pattern === "string" ? message.includes(pattern) : pattern.test(message);
      expect(matches).toBe(false);
    }
  });
});
