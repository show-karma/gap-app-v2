import {
  ApiError,
  ContractViolationError,
  getErrorCode,
  HttpError,
  isApiError,
  NetworkError,
  parseRetryAfterMs,
  RequestAborted,
  stripQuery,
  TimeoutError,
  toApiError,
} from "../errors";

describe("stripQuery", () => {
  it("strips a query string from a path", () => {
    expect(stripQuery("/v2/projects?limit=10&page=2")).toBe("/v2/projects");
  });

  it("strips a query string from a full URL", () => {
    expect(stripQuery("https://api.example.com/v2/projects?limit=10")).toBe(
      "https://api.example.com/v2/projects"
    );
  });

  it("returns the input unchanged when there is no query string", () => {
    expect(stripQuery("/v2/projects/123")).toBe("/v2/projects/123");
  });
});

describe("parseRetryAfterMs", () => {
  it("parses integer seconds into milliseconds", () => {
    expect(parseRetryAfterMs("7")).toBe(7000);
  });

  it("parses a numeric header value", () => {
    expect(parseRetryAfterMs(5)).toBe(5000);
  });

  it("parses an HTTP-date into a millisecond delta, clamped >= 0", () => {
    const future = new Date(Date.now() + 10_000).toUTCString();
    const ms = parseRetryAfterMs(future);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(10_000 + 1000); // small tolerance for test runtime
  });

  it("clamps an HTTP-date far in the future to 120_000ms", () => {
    const farFuture = new Date(Date.now() + 10_000_000).toUTCString();
    expect(parseRetryAfterMs(farFuture)).toBe(120_000);
  });

  it("clamps a past HTTP-date to 0", () => {
    const past = new Date(Date.now() - 10_000).toUTCString();
    expect(parseRetryAfterMs(past)).toBe(0);
  });

  it("returns undefined for garbage input", () => {
    expect(parseRetryAfterMs("abc")).toBeUndefined();
  });

  it("returns undefined for undefined/null", () => {
    expect(parseRetryAfterMs(undefined)).toBeUndefined();
    expect(parseRetryAfterMs(null)).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(parseRetryAfterMs("")).toBeUndefined();
  });

  it("unwraps an array header value (raw axios headers shape)", () => {
    expect(parseRetryAfterMs(["7"])).toBe(7000);
  });
});

describe("getErrorCode", () => {
  it("reads a top-level string code", () => {
    expect(getErrorCode({ code: "ECONNRESET" })).toBe("ECONNRESET");
  });

  it("walks a single-level cause chain", () => {
    const err = { message: "fetch failed", cause: { code: "ECONNRESET" } };
    expect(getErrorCode(err)).toBe("ECONNRESET");
  });

  it("walks a multi-level cause chain", () => {
    const err = { cause: { cause: { cause: { code: "ETIMEDOUT" } } } };
    expect(getErrorCode(err)).toBe("ETIMEDOUT");
  });

  it("stops at a depth guard and returns undefined for a too-deep chain", () => {
    let deepest: unknown = { code: "TOO_DEEP" };
    for (let i = 0; i < 10; i++) {
      deepest = { cause: deepest };
    }
    expect(getErrorCode(deepest)).toBeUndefined();
  });

  it("returns undefined when no code is found anywhere in the chain", () => {
    expect(getErrorCode({ message: "no code here" })).toBeUndefined();
  });

  it("returns undefined for non-object input", () => {
    expect(getErrorCode("just a string")).toBeUndefined();
    expect(getErrorCode(null)).toBeUndefined();
    expect(getErrorCode(undefined)).toBeUndefined();
  });

  it("ignores a non-string code and keeps walking the cause chain", () => {
    const err = { code: 500, cause: { code: "REAL_CODE" } };
    expect(getErrorCode(err)).toBe("REAL_CODE");
  });
});

describe("HttpError", () => {
  it("marks 408/429/502/503/504 as retryable", () => {
    for (const status of [408, 429, 502, 503, 504]) {
      const err = new HttpError(status, { endpoint: "/x", method: "get" });
      expect(err.retryable).toBe(true);
    }
  });

  it("marks other statuses (e.g. 500, 400, 404) as non-retryable", () => {
    for (const status of [400, 404, 500]) {
      const err = new HttpError(status, { endpoint: "/x", method: "get" });
      expect(err.retryable).toBe(false);
    }
  });

  it("429 is expected", () => {
    const err = new HttpError(429, { endpoint: "/x", method: "get" });
    expect(err.expected).toBe(true);
    expect(err.retryable).toBe(true);
  });

  it("500 is not expected and not retryable", () => {
    const err = new HttpError(500, { endpoint: "/x", method: "get" });
    expect(err.expected).toBe(false);
    expect(err.retryable).toBe(false);
  });

  it("uppercases method and strips query from endpoint", () => {
    const err = new HttpError(500, { endpoint: "/v2/projects?limit=10", method: "post" });
    expect(err.method).toBe("POST");
    expect(err.endpoint).toBe("/v2/projects");
  });

  it("carries body and retryAfterMs through", () => {
    const err = new HttpError(429, {
      endpoint: "/x",
      method: "get",
      body: { message: "rate limited" },
      retryAfterMs: 5000,
    });
    expect(err.body).toEqual({ message: "rate limited" });
    expect(err.retryAfterMs).toBe(5000);
  });

  it("is both instanceof ApiError and instanceof HttpError", () => {
    const err = new HttpError(500, { endpoint: "/x", method: "get" });
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(Error);
  });

  it("sets kind to http", () => {
    const err = new HttpError(500, { endpoint: "/x", method: "get" });
    expect(err.kind).toBe("http");
  });
});

describe("NetworkError", () => {
  it("is always retryable and expected", () => {
    const err = new NetworkError({ endpoint: "/x", method: "get" });
    expect(err.retryable).toBe(true);
    expect(err.expected).toBe(true);
    expect(err.kind).toBe("network");
  });

  it("carries an optional code", () => {
    const err = new NetworkError({ endpoint: "/x", method: "get", code: "ECONNRESET" });
    expect(err.code).toBe("ECONNRESET");
  });

  it("is instanceof ApiError and NetworkError", () => {
    const err = new NetworkError({ endpoint: "/x", method: "get" });
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(NetworkError);
  });
});

describe("TimeoutError", () => {
  it("is retryable (matches 408's classification) and expected", () => {
    const err = new TimeoutError({ endpoint: "/x", method: "get", timeoutMs: 30_000 });
    expect(err.retryable).toBe(true);
    expect(err.expected).toBe(true);
    expect(err.kind).toBe("timeout");
    expect(err.timeoutMs).toBe(30_000);
  });
});

describe("RequestAborted", () => {
  it("is never retryable but is expected", () => {
    const err = new RequestAborted({ endpoint: "/x", method: "get" });
    expect(err.retryable).toBe(false);
    expect(err.expected).toBe(true);
    expect(err.kind).toBe("aborted");
  });
});

describe("ContractViolationError", () => {
  it("is never retryable and never expected", () => {
    const err = new ContractViolationError({ endpoint: "/x", method: "get", issues: ["bad"] });
    expect(err.retryable).toBe(false);
    expect(err.expected).toBe(false);
    expect(err.kind).toBe("contract");
    expect(err.issues).toEqual(["bad"]);
  });
});

describe("isApiError", () => {
  it("returns true for any ApiError subclass", () => {
    expect(isApiError(new HttpError(500, { endpoint: "/x", method: "get" }))).toBe(true);
    expect(isApiError(new NetworkError({ endpoint: "/x", method: "get" }))).toBe(true);
    expect(isApiError(new TimeoutError({ endpoint: "/x", method: "get", timeoutMs: 1000 }))).toBe(
      true
    );
    expect(isApiError(new RequestAborted({ endpoint: "/x", method: "get" }))).toBe(true);
    expect(
      isApiError(new ContractViolationError({ endpoint: "/x", method: "get", issues: [] }))
    ).toBe(true);
  });

  it("returns false for a plain Error or non-error values", () => {
    expect(isApiError(new Error("boom"))).toBe(false);
    expect(isApiError("boom")).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });
});

describe("toApiError classification", () => {
  it("classifies ctx.signal.aborted as RequestAborted", () => {
    const controller = new AbortController();
    controller.abort();
    const raw = new Error("aborted somehow");
    const err = toApiError(raw, { endpoint: "/x", method: "get", signal: controller.signal });
    expect(err).toBeInstanceOf(RequestAborted);
  });

  it("classifies axios err.code === ERR_CANCELED as RequestAborted", () => {
    const raw = { code: "ERR_CANCELED", message: "canceled" };
    const err = toApiError(raw, { endpoint: "/x", method: "get" });
    expect(err).toBeInstanceOf(RequestAborted);
  });

  it("classifies err.code === ABORT_ERR as RequestAborted", () => {
    const raw = { code: "ABORT_ERR", message: "aborted" };
    const err = toApiError(raw, { endpoint: "/x", method: "get" });
    expect(err).toBeInstanceOf(RequestAborted);
  });

  it("classifies err.name === CanceledError as RequestAborted", () => {
    const raw = { name: "CanceledError", message: "canceled" };
    const err = toApiError(raw, { endpoint: "/x", method: "get" });
    expect(err).toBeInstanceOf(RequestAborted);
  });

  it("classifies err.name === AbortError as RequestAborted", () => {
    const raw = { name: "AbortError", message: "aborted" };
    const err = toApiError(raw, { endpoint: "/x", method: "get" });
    expect(err).toBeInstanceOf(RequestAborted);
  });

  it("prioritizes abort over timeout when BOTH an abort signal and an ECONNABORTED code are present", () => {
    // A request that was aborted mid-flight can surface as an axios
    // ECONNABORTED failure — abort must win so callers don't retry it.
    const controller = new AbortController();
    controller.abort();
    const raw = { code: "ECONNABORTED", message: "timeout of 30000ms exceeded" };
    const err = toApiError(raw, { endpoint: "/x", method: "get", signal: controller.signal });
    expect(err).toBeInstanceOf(RequestAborted);
    expect(err).not.toBeInstanceOf(TimeoutError);
  });

  it("classifies an axios-style err.response into HttpError with status/body", () => {
    const raw = {
      message: "Request failed with status code 500",
      response: { status: 500, data: { message: "server exploded" }, headers: {} },
    };
    const err = toApiError(raw, { endpoint: "/v2/x?a=1", method: "post" });
    expect(err).toBeInstanceOf(HttpError);
    const httpErr = err as HttpError;
    expect(httpErr.status).toBe(500);
    expect(httpErr.body).toEqual({ message: "server exploded" });
    expect(httpErr.endpoint).toBe("/v2/x");
    expect(httpErr.method).toBe("POST");
  });

  it("parses retry-after header off an HttpError response", () => {
    const raw = {
      response: { status: 429, data: {}, headers: { "retry-after": "3" } },
    };
    const err = toApiError(raw, { endpoint: "/x", method: "get" }) as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.retryAfterMs).toBe(3000);
    expect(err.expected).toBe(true);
    expect(err.retryable).toBe(true);
  });

  it("classifies ECONNABORTED without a response as TimeoutError", () => {
    const raw = { code: "ECONNABORTED", message: "timeout of 30000ms exceeded" };
    const err = toApiError(raw, { endpoint: "/x", method: "get", timeoutMs: 30_000 });
    expect(err).toBeInstanceOf(TimeoutError);
    expect((err as TimeoutError).timeoutMs).toBe(30_000);
  });

  it("classifies ETIMEDOUT without a response as TimeoutError, defaulting timeoutMs to 30000", () => {
    const raw = { code: "ETIMEDOUT" };
    const err = toApiError(raw, { endpoint: "/x", method: "get" });
    expect(err).toBeInstanceOf(TimeoutError);
    expect((err as TimeoutError).timeoutMs).toBe(30_000);
  });

  it("classifies an undici TypeError('fetch failed', { cause: { code } }) as NetworkError with the nested code", () => {
    const raw = new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
    const err = toApiError(raw, { endpoint: "/x", method: "get" });
    expect(err).toBeInstanceOf(NetworkError);
    expect((err as NetworkError).code).toBe("ECONNRESET");
  });

  it("classifies any other no-response failure as NetworkError", () => {
    const raw = new Error("Network Error");
    const err = toApiError(raw, { endpoint: "/x", method: "get" });
    expect(err).toBeInstanceOf(NetworkError);
  });

  it("returns an already-classified ApiError unchanged (idempotent)", () => {
    const original = new HttpError(500, { endpoint: "/x", method: "get" });
    const result = toApiError(original, { endpoint: "/other", method: "post" });
    expect(result).toBe(original);
  });

  it("is idempotent even for a NetworkError whose .code collides with a timeout code", () => {
    // NetworkError has its own `.code` field using the same key axios uses
    // for its error code — re-classifying must not misread that as a raw
    // ECONNABORTED/ETIMEDOUT and wrap it into a TimeoutError.
    const original = new NetworkError({ endpoint: "/x", method: "get", code: "ECONNABORTED" });
    const result = toApiError(original, { endpoint: "/x", method: "get" });
    expect(result).toBe(original);
    expect(result).toBeInstanceOf(NetworkError);
  });

  it("strips query string and uppercases method on every classified error", () => {
    const raw = new Error("Network Error");
    const err = toApiError(raw, { endpoint: "/v2/things?x=1&y=2", method: "delete" });
    expect(err.endpoint).toBe("/v2/things");
    expect(err.method).toBe("DELETE");
  });
});
