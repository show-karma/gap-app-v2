/**
 * @file Tests for `toErrorCode`, the reducer every `_failed` event uses.
 *
 * The property that matters is stability: the same class of failure must always
 * produce the same string, and an error message — which carries ids, addresses
 * and backend prose that changes between releases — must never become one.
 */

import { toErrorCode } from "@/utilities/analytics/error-code";

describe("toErrorCode", () => {
  it("prefers an HTTP status, the most specific stable code available", () => {
    expect(toErrorCode({ response: { status: 404 }, name: "AxiosError" })).toBe("http_404");
    expect(toErrorCode({ status: 429 })).toBe("http_429");
  });

  it("falls back to a machine code when there is no status", () => {
    expect(toErrorCode({ code: "ECONNABORTED" })).toBe("ECONNABORTED");
  });

  it("falls back to the error's class name", () => {
    expect(toErrorCode(new TypeError("undefined is not a function"))).toBe("TypeError");

    class ChainSetupAbortedError extends Error {
      name = "ChainSetupAbortedError";
    }
    expect(toErrorCode(new ChainSetupAbortedError())).toBe("ChainSetupAbortedError");
  });

  it.each([[null], [undefined], ["a string"], [42], [{}]])(
    "reports %s as unknown rather than throwing",
    (value) => {
      expect(toErrorCode(value)).toBe("unknown");
    }
  );

  it("never returns the error message", () => {
    const error = Object.assign(new Error("Failed for user 0xabc with email a@b.test"), {
      response: { status: 500 },
    });

    expect(toErrorCode(error)).toBe("http_500");
  });
});
