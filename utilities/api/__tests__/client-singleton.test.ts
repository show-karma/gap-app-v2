/**
 * Coverage for the exported `api` singleton's glue (utilities/api/client.ts,
 * bottom of the file): getAuthToken -> TokenManager.getToken, onAuthExpired
 * -> TokenManager.clearCache + getToken, onExhausted -> reportApiFailure.
 *
 * utilities/api/__tests__/client.test.ts only exercises `createApiClient`
 * with local vi.fn() hooks — it never imports the `api` export, so this glue
 * is otherwise untested (e.g. dropping `TokenManager.clearCache()` from
 * `onAuthExpired` would silently turn a 401 refresh into a no-op and no
 * existing test would fail).
 */
import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { api } from "@/utilities/api/client";
import { TokenManager } from "@/utilities/auth/token-manager";

vi.mock("axios");
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn(),
    clearCache: vi.fn(),
  },
}));

function mockedRequest() {
  return axios.request as vi.Mock;
}

describe("api singleton — auth wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the token via TokenManager.getToken for an authorized request", async () => {
    (TokenManager.getToken as vi.Mock).mockResolvedValue("stale-token");
    mockedRequest().mockResolvedValue({ data: { ok: true }, status: 200 });

    await api.get("/things");

    expect(TokenManager.getToken).toHaveBeenCalledTimes(1);
    expect(mockedRequest().mock.calls[0][0].headers.Authorization).toBe("Bearer stale-token");
  });

  it("clears the cache then re-fetches a fresh token via TokenManager on a 401, and retries with it", async () => {
    (TokenManager.getToken as vi.Mock)
      .mockResolvedValueOnce("stale-token")
      .mockResolvedValueOnce("fresh-token");
    mockedRequest()
      .mockRejectedValueOnce({ response: { status: 401, data: {} } })
      .mockResolvedValueOnce({ data: { ok: true }, status: 200 });

    const result = await api.get("/things");

    expect(TokenManager.clearCache).toHaveBeenCalledTimes(1);
    expect(TokenManager.getToken).toHaveBeenCalledTimes(2);
    expect(mockedRequest().mock.calls[1][0].headers.Authorization).toBe("Bearer fresh-token");
    expect(result).toEqual({ ok: true });

    // clearCache must run BEFORE the second getToken call, otherwise the
    // refresh would re-fetch the same cached (stale) token.
    const clearCacheOrder = (TokenManager.clearCache as vi.Mock).mock.invocationCallOrder[0];
    const secondGetTokenOrder = (TokenManager.getToken as vi.Mock).mock.invocationCallOrder[1];
    expect(clearCacheOrder).toBeLessThan(secondGetTokenOrder);
  });
});

describe("api singleton — onExhausted reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("window", undefined);
    (TokenManager.getToken as vi.Mock).mockResolvedValue("token-1");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reports a genuine retry exhaustion via reportApiFailure (Sentry captureMessage) for a transient server-side failure", async () => {
    mockedRequest().mockRejectedValue({ response: { status: 503, data: {} } });

    const assertion = expect(api.get("/things")).rejects.toBeTruthy();
    await vi.runAllTimersAsync();
    await assertion;

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("exhausted retries"),
      expect.objectContaining({ level: "warning" })
    );
  });
});
