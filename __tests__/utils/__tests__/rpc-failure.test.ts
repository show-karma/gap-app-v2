import { describe, expect, it } from "vitest";
import { createFailingTransport } from "../rpc-failure";

/**
 * Helper: calls the transport's request function for a given RPC method.
 * The custom() wrapper from viem returns a transport factory; we invoke it
 * to get the actual transport, then call its `request` method.
 */
async function callTransport(transport: ReturnType<typeof createFailingTransport>, method: string) {
  const instance = transport({ chain: { id: 1 } as any, retryCount: 0 });
  return instance.request({ method } as any);
}

describe("createFailingTransport", () => {
  it("passes through methods not in the failure list", async () => {
    const transport = createFailingTransport([
      { method: "eth_sendTransaction", failure: "revert" },
    ]);
    const result = await callTransport(transport, "eth_blockNumber");
    expect(result).toBeNull();
  });

  it("simulates network-error", async () => {
    const transport = createFailingTransport([{ method: "eth_call", failure: "network-error" }]);
    await expect(callTransport(transport, "eth_call")).rejects.toThrow("Failed to fetch");
  });

  it("simulates gas-estimation-error", async () => {
    const transport = createFailingTransport([
      { method: "eth_estimateGas", failure: "gas-estimation-error" },
    ]);
    await expect(callTransport(transport, "eth_estimateGas")).rejects.toThrow(
      "gas estimation failed"
    );
  });

  it("simulates nonce-too-low", async () => {
    const transport = createFailingTransport([
      { method: "eth_sendTransaction", failure: "nonce-too-low" },
    ]);
    await expect(callTransport(transport, "eth_sendTransaction")).rejects.toThrow("nonce too low");
  });

  it("simulates revert", async () => {
    const transport = createFailingTransport([
      { method: "eth_sendTransaction", failure: "revert" },
    ]);
    await expect(callTransport(transport, "eth_sendTransaction")).rejects.toThrow(
      "execution reverted"
    );
  });

  it("simulates quota-exceeded", async () => {
    const transport = createFailingTransport([
      { method: "eth_sendTransaction", failure: "quota-exceeded" },
    ]);
    await expect(callTransport(transport, "eth_sendTransaction")).rejects.toThrow(
      "relay quota exceeded"
    );
  });

  it("simulates rate-limit with code 429", async () => {
    const transport = createFailingTransport([{ method: "eth_call", failure: "rate-limit" }]);
    try {
      await callTransport(transport, "eth_call");
      expect.unreachable("should have thrown");
    } catch (err: any) {
      // viem may wrap the error; check that the original message is present
      expect(err.message).toContain("Too Many Requests");
    }
  });

  it("simulates timeout with custom delay", async () => {
    const transport = createFailingTransport([
      { method: "eth_call", failure: "timeout", delayMs: 50 },
    ]);
    const start = Date.now();
    await expect(callTransport(transport, "eth_call")).rejects.toThrow("Request timed out");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});
