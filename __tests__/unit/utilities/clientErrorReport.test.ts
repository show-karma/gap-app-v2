import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportClientError } from "@/utilities/clientErrorReport";

describe("reportClientError", () => {
  const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("posts the serialized error and context to /api/client-error with keepalive", () => {
    const error = new Error("could not coalesce error");
    reportClientError("Error verifying milestone", error, { milestoneUID: "0xabc", chainId: 8453 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/client-error");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    const body = JSON.parse(init.body as string);
    expect(body.errorMessage).toBe("Error verifying milestone");
    expect(body.error.message).toBe("could not coalesce error");
    expect(body.error.name).toBe("Error");
    expect(body.extra).toEqual({ milestoneUID: "0xabc", chainId: 8453 });
  });

  it("never throws when fetch rejects", async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    expect(() => reportClientError("x", new Error("y"))).not.toThrow();
    await Promise.resolve();
  });

  it("unwraps the nested provider response that ethers hides under info/error", () => {
    const rpcResponse = { code: -32603, message: "UserOperation reverted: AA23 reverted" };
    const wrapped = Object.assign(new Error("could not coalesce error"), {
      code: "UNKNOWN_ERROR",
      info: { error: rpcResponse, payload: { method: "eth_sendUserOperation" } },
    });
    reportClientError("Error verifying milestone", wrapped);
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    );
    expect(body.error.message).toBe("could not coalesce error");
    expect(body.error.info.error.message).toBe("UserOperation reverted: AA23 reverted");
    expect(body.error.info.error.code).toBe(-32603);
  });

  it("stops unwrapping at a bounded depth on self-referencing errors", () => {
    const loop: Record<string, unknown> = { message: "loop" };
    loop.cause = loop;
    expect(() => reportClientError("x", loop)).not.toThrow();
  });

  it("attaches browser environment and injected wallet flags", () => {
    vi.stubGlobal("ethereum", { isMetaMask: true, providers: [{}, {}] });
    reportClientError("x", new Error("y"));
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    );
    expect(typeof body.browser.userAgent).toBe("string");
    expect(body.browser.injectedWallet).toEqual(
      expect.objectContaining({ isMetaMask: true, providers: 2 })
    );
  });

  it("redacts secrets by key name and by value shape, and strips the query string", () => {
    vi.stubGlobal("location", {
      origin: "https://app.filpgf.io",
      pathname: "/manage/action-items",
      href: "https://app.filpgf.io/manage/action-items?token=abc#review-0x1",
    });
    const jwt =
      "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJkaWQ6cHJpdnk6YWJjIn0.c2lnbmF0dXJlLXNpZ25hdHVyZS1zaWc";
    const wrapped = Object.assign(new Error(`request failed: Bearer ${jwt}`), {
      originalError: {
        config: { headers: { Authorization: `Bearer ${jwt}` } },
        data: { apiKey: "karma_abc123" },
      },
    });
    reportClientError("x", wrapped, {
      authorization: "Bearer zzz",
      note: `key karma_fakekey01 here`,
    });
    const raw = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string;
    expect(raw).not.toContain(jwt);
    expect(raw).not.toContain("karma_abc123");
    expect(raw).not.toContain("karma_fakekey01");
    expect(raw).not.toContain("token=abc");
    const body = JSON.parse(raw);
    expect(body.url).toBe("https://app.filpgf.io/manage/action-items");
    expect(body.extra.authorization).toBe("[redacted]");
    expect(body.error.originalError.data.apiKey).toBe("[redacted]");
  });

  it("serializes non-Error values", () => {
    reportClientError("x", "plain string failure");
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    );
    expect(body.error.message).toBe("plain string failure");
  });
});
