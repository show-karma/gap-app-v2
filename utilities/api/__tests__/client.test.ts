import axios from "axios";
import { z } from "zod";
import { createApiClient } from "@/utilities/api/client";
import {
  ApiError,
  ContractViolationError,
  HttpError,
  isApiError,
  RequestAborted,
  TimeoutError,
} from "@/utilities/api/errors";

vi.mock("axios");

function mockedRequest() {
  return axios.request as vi.Mock;
}

function buildClient(overrides: Partial<Parameters<typeof createApiClient>[0]> = {}) {
  const getAuthToken = vi.fn().mockResolvedValue("token-1");
  // onAuthExpired resolves the FRESH token (or null when refresh fails).
  const onAuthExpired = vi.fn().mockResolvedValue(null);
  const onExhausted = vi.fn();
  const client = createApiClient({
    baseURL: "https://api.test",
    getAuthToken,
    onAuthExpired,
    onExhausted,
    ...overrides,
  });
  return { client, getAuthToken, onAuthExpired, onExhausted };
}

describe("client — 1. auth header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches Authorization: Bearer <token> when isAuthorized (default) and a token is available", async () => {
    mockedRequest().mockResolvedValue({ data: { ok: true }, status: 200 });
    const { client, getAuthToken } = buildClient();

    await client.get("/things");

    expect(getAuthToken).toHaveBeenCalledTimes(1);
    const config = mockedRequest().mock.calls[0][0];
    expect(config.headers.Authorization).toBe("Bearer token-1");
  });

  it("does not attach a header or fetch a token when isAuthorized is false", async () => {
    mockedRequest().mockResolvedValue({ data: { ok: true }, status: 200 });
    const { client, getAuthToken } = buildClient();

    await client.get("/things", { isAuthorized: false });

    expect(getAuthToken).not.toHaveBeenCalled();
    const config = mockedRequest().mock.calls[0][0];
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("does not attach a header for a non-default baseURL override (adapter parity for non-indexer calls)", async () => {
    mockedRequest().mockResolvedValue({ data: { ok: true }, status: 200 });
    const { client, getAuthToken } = buildClient();

    await client.get("/things", { baseURL: "https://other.test" });

    expect(getAuthToken).not.toHaveBeenCalled();
    const config = mockedRequest().mock.calls[0][0];
    expect(config.headers.Authorization).toBeUndefined();
    expect(config.url).toBe("https://other.test/things");
  });
});

describe("client — 2. 401 refresh once per logical request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes the token once on 401 and retries with the fresh token returned by onAuthExpired", async () => {
    mockedRequest()
      .mockRejectedValueOnce({ response: { status: 401, data: {} } })
      .mockResolvedValueOnce({ data: { ok: true }, status: 200 });
    const { client, onAuthExpired, getAuthToken } = buildClient();
    getAuthToken.mockResolvedValue("stale");
    onAuthExpired.mockResolvedValue("fresh");

    const result = await client.get("/things");

    expect(onAuthExpired).toHaveBeenCalledTimes(1);
    expect(mockedRequest()).toHaveBeenCalledTimes(2);
    expect(mockedRequest().mock.calls[1][0].headers.Authorization).toBe("Bearer fresh");
    // the fresh token comes from onAuthExpired's return — getToken is NOT
    // re-called after the refresh (only the initial pre-request fetch).
    expect(getAuthToken).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it("throws HttpError(401) on a second consecutive 401 without retrying again", async () => {
    mockedRequest().mockRejectedValue({ response: { status: 401, data: {} } });
    const { client, onAuthExpired } = buildClient();
    onAuthExpired.mockResolvedValue("fresh");

    const error = await client.get("/things").catch((e) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(401);
    // exactly one refresh retry — not a retry per outer attempt
    expect(mockedRequest()).toHaveBeenCalledTimes(2);
  });

  it("does not attempt a refresh when onAuthExpired resolves null", async () => {
    mockedRequest().mockRejectedValue({ response: { status: 401, data: {} } });
    const { client, onAuthExpired } = buildClient();
    onAuthExpired.mockResolvedValue(null);

    await expect(client.get("/things")).rejects.toBeInstanceOf(HttpError);
    expect(mockedRequest()).toHaveBeenCalledTimes(1);
  });
});

describe("client — 3. timeout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes timeoutMs (default 30000) through to axios and classifies ECONNABORTED as TimeoutError", async () => {
    mockedRequest().mockRejectedValue({
      code: "ECONNABORTED",
      message: "timeout of 30000ms exceeded",
    });
    const { client } = buildClient();

    await expect(client.get("/things")).rejects.toBeInstanceOf(TimeoutError);
    expect(mockedRequest().mock.calls[0][0].timeout).toBe(30_000);
  });

  it("honors a custom timeoutMs", async () => {
    mockedRequest().mockResolvedValue({ data: { ok: true }, status: 200 });
    const { client } = buildClient();

    await client.get("/things", { timeoutMs: 5_000 });

    expect(mockedRequest().mock.calls[0][0].timeout).toBe(5_000);
  });
});

describe("client — 4. retry via executeWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retries a retryable GET failure server-side and eventually succeeds", async () => {
    vi.stubGlobal("window", undefined);
    mockedRequest()
      .mockRejectedValueOnce({ response: { status: 503, data: {} } })
      .mockResolvedValueOnce({ data: { ok: true }, status: 200 });
    const { client } = buildClient();

    const promise = client.get("/things");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockedRequest()).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true });
  });

  it("honors HttpError.retryAfterMs capped at 30000 for the retry delay", async () => {
    vi.stubGlobal("window", undefined);
    mockedRequest()
      .mockRejectedValueOnce({
        response: { status: 429, data: {}, headers: { "retry-after": "9999" } },
      })
      .mockResolvedValueOnce({ data: { ok: true }, status: 200 });
    const { client } = buildClient();

    const promise = client.get("/things");
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await promise;

    expect(result).toEqual({ ok: true });
  });

  it("calls onExhausted exactly once with the final error and attempt count once retries exhaust", async () => {
    vi.stubGlobal("window", undefined);
    mockedRequest().mockRejectedValue({ response: { status: 503, data: {} } });
    const { client, onExhausted } = buildClient();

    const promise = client.get("/things");
    const assertion = expect(promise).rejects.toBeInstanceOf(HttpError);
    await vi.runAllTimersAsync();
    await assertion;

    expect(onExhausted).toHaveBeenCalledTimes(1);
    expect(onExhausted).toHaveBeenCalledWith(expect.any(HttpError), 3);
  });

  it("retries only server-side — browser caps attempts at 1 even for a retryable error", async () => {
    // window is left defined (default jsdom) => browser
    mockedRequest().mockRejectedValue({ response: { status: 503, data: {} } });
    const { client } = buildClient();

    await expect(client.get("/things")).rejects.toBeInstanceOf(HttpError);
    expect(mockedRequest()).toHaveBeenCalledTimes(1);
  });

  it("does not retry a POST without an idempotencyKey even though the error is retryable", async () => {
    vi.stubGlobal("window", undefined);
    mockedRequest().mockRejectedValue({ response: { status: 503, data: {} } });
    const { client } = buildClient();

    await expect(client.post("/things", { a: 1 })).rejects.toBeInstanceOf(HttpError);
    expect(mockedRequest()).toHaveBeenCalledTimes(1);
  });

  it("retries a POST when an idempotencyKey is provided", async () => {
    vi.stubGlobal("window", undefined);
    mockedRequest()
      .mockRejectedValueOnce({ response: { status: 503, data: {} } })
      .mockResolvedValueOnce({ data: { ok: true }, status: 200 });
    const { client } = buildClient();

    const promise = client.post("/things", { a: 1 }, { idempotencyKey: "key-1" });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockedRequest()).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true });
  });

  it("does not retry once the caller's signal is already aborted", async () => {
    vi.stubGlobal("window", undefined);
    const controller = new AbortController();
    controller.abort();
    mockedRequest().mockRejectedValue({ response: { status: 503, data: {} } });
    const { client } = buildClient();

    await expect(client.get("/things", { signal: controller.signal })).rejects.toBeInstanceOf(
      RequestAborted
    );
    expect(mockedRequest()).toHaveBeenCalledTimes(1);
  });
});

describe("client — 4b. onExhausted only reports a genuine retry exhaustion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does NOT call onExhausted for a single-attempt 400 (server-side, non-retryable)", async () => {
    vi.stubGlobal("window", undefined);
    mockedRequest().mockRejectedValue({ response: { status: 400, data: { message: "bad" } } });
    const { client, onExhausted } = buildClient();

    await expect(client.get("/things")).rejects.toBeInstanceOf(HttpError);
    expect(mockedRequest()).toHaveBeenCalledTimes(1);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("does NOT call onExhausted for a browser-side network error (attempts capped at 1)", async () => {
    // window left defined => browser; network errors are retryable but the
    // browser never retries, so this is a single-attempt failure.
    mockedRequest().mockRejectedValue(new Error("Network Error"));
    const { client, onExhausted } = buildClient();

    await expect(client.get("/things")).rejects.toBeInstanceOf(ApiError);
    expect(mockedRequest()).toHaveBeenCalledTimes(1);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("calls onExhausted exactly once for a server-side retryable error that exhausts its retries", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", undefined);
    mockedRequest().mockRejectedValue({ response: { status: 503, data: {} } });
    const { client, onExhausted } = buildClient();

    const promise = client.get("/things");
    const assertion = expect(promise).rejects.toBeInstanceOf(HttpError);
    await vi.runAllTimersAsync();
    await assertion;

    expect(mockedRequest()).toHaveBeenCalledTimes(3);
    expect(onExhausted).toHaveBeenCalledTimes(1);
    expect(onExhausted).toHaveBeenCalledWith(expect.any(HttpError), 3);
    vi.useRealTimers();
  });
});

describe("client — 5. every rejection is mapped through toApiError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["a plain network Error with no response", new Error("Network Error")],
    ["an HTTP 500 response", { response: { status: 500, data: { message: "boom" } } }],
    ["an ECONNABORTED timeout", { code: "ECONNABORTED", message: "timeout" }],
    ["a cancel error", { code: "ERR_CANCELED", name: "CanceledError" }],
  ])("wraps %s into an ApiError — no raw AxiosError escapes", async (_label, rejection) => {
    mockedRequest().mockRejectedValue(rejection);
    const { client } = buildClient();

    const caught = await client.get("/things").catch((e) => e);

    expect(isApiError(caught)).toBe(true);
    expect(caught).toBeInstanceOf(ApiError);
  });
});

describe("client — 6. schema validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the zod-parsed value when the response matches the schema", async () => {
    mockedRequest().mockResolvedValue({ data: { id: "1" }, status: 200 });
    const { client } = buildClient();
    const schema = z.object({ id: z.string() });

    const result = await client.get("/things/1", { schema });

    expect(result).toEqual({ id: "1" });
  });

  it("throws ContractViolationError capped at 10 issues, without leaking the raw body", async () => {
    mockedRequest().mockResolvedValue({ data: {}, status: 200 });
    const { client } = buildClient();
    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
      d: z.string(),
      e: z.string(),
      f: z.string(),
      g: z.string(),
      h: z.string(),
      i: z.string(),
      j: z.string(),
      k: z.string(),
      l: z.string(),
    });

    const error = await client.get("/things/1", { schema }).catch((e) => e);

    expect(error).toBeInstanceOf(ContractViolationError);
    expect(error.issues.length).toBeLessThanOrEqual(10);
    expect(JSON.stringify(error)).not.toContain("secretValueThatShouldNotLeak");
  });

  it("returns the raw payload untouched when no schema is provided", async () => {
    mockedRequest().mockResolvedValue({ data: { anything: true }, status: 200 });
    const { client } = buildClient();

    const result = await client.get("/things/1");

    expect(result).toEqual({ anything: true });
  });
});

describe("client — 7. envelope unwrap + pageInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("request() returns { data, status, pageInfo } — pageInfo pulled from body.pageInfo", async () => {
    mockedRequest().mockResolvedValue({
      data: { data: [1, 2, 3], pageInfo: { page: 1, totalItems: 3 } },
      status: 200,
    });
    const { client } = buildClient();

    const result = await client.request("GET", "/things", undefined);

    expect(result.status).toBe(200);
    expect(result.pageInfo).toEqual({ page: 1, totalItems: 3 });
    expect(result.data).toEqual({ data: [1, 2, 3], pageInfo: { page: 1, totalItems: 3 } });
  });

  it("request() returns pageInfo: null when the body has none", async () => {
    mockedRequest().mockResolvedValue({ data: { ok: true }, status: 200 });
    const { client } = buildClient();

    const result = await client.request("GET", "/things", undefined);

    expect(result.pageInfo).toBeNull();
  });

  it("get<T>() returns the whole body even when it carries a pageInfo key (legacy parity)", async () => {
    mockedRequest().mockResolvedValue({
      data: { data: [1, 2], pageInfo: { page: 1 } },
      status: 200,
    });
    const { client } = buildClient();

    const result = await client.get("/things");

    expect(result).toEqual({ data: [1, 2], pageInfo: { page: 1 } });
  });

  it("getPaginated<T>() splits the envelope into { data: body.data, pageInfo }", async () => {
    mockedRequest().mockResolvedValue({
      data: { data: [1, 2], pageInfo: { page: 1, totalItems: 2 } },
      status: 200,
    });
    const { client } = buildClient();

    const result = await client.getPaginated("/things");

    expect(result).toEqual({ data: [1, 2], pageInfo: { page: 1, totalItems: 2 } });
  });
});

describe("client — 8. cache query param", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appends ?cache=<v> for the default baseURL when opts.cache is set", async () => {
    mockedRequest().mockResolvedValue({ data: { ok: true }, status: 200 });
    const { client } = buildClient();

    await client.get("/things", { cache: true });

    expect(mockedRequest().mock.calls[0][0].url).toBe("https://api.test/things?cache=true");
  });

  it("appends &cache=<v> when the path already has a query string", async () => {
    mockedRequest().mockResolvedValue({ data: { ok: true }, status: 200 });
    const { client } = buildClient();

    await client.get("/things?foo=bar", { cache: true });

    expect(mockedRequest().mock.calls[0][0].url).toBe("https://api.test/things?foo=bar&cache=true");
  });

  it("does not append cache for a non-default baseURL override", async () => {
    mockedRequest().mockResolvedValue({ data: { ok: true }, status: 200 });
    const { client } = buildClient();

    await client.get("/things", { cache: true, baseURL: "https://other.test" });

    expect(mockedRequest().mock.calls[0][0].url).toBe("https://other.test/things");
  });
});
