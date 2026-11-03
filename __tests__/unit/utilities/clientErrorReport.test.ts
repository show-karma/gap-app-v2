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
    expect(JSON.parse(body.extra)).toEqual({ milestoneUID: "0xabc", chainId: 8453 });
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

  it("serializes non-Error values", () => {
    reportClientError("x", "plain string failure");
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    );
    expect(body.error.message).toBe("plain string failure");
  });
});
