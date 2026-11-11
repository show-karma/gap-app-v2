vi.mock("@/utilities/clientErrorReport", () => ({
  reportClientError: vi.fn(),
}));

import { reportClientError } from "@/utilities/clientErrorReport";
import {
  isStuckNonceError,
  recoverStuckNonce,
  withStuckNonceRecovery,
} from "@/utilities/gasless/utils/stuckNonceRecovery";

const AA25 =
  "AA25 invalid account nonce: Another UserOperation with same sender and nonce is already being processed";

const TX = {
  from: "0x8353e73573194D9275d82f775d248D30235E403a",
  to: "0x7177adc0f924b695c0294a40c4c5feff5ee1e141" as `0x${string}`,
  data: "0x5913a31c" as `0x${string}`,
  value: "0x0" as `0x${string}`,
};

const ethersWrapped = () =>
  Object.assign(new Error(`could not coalesce error (error={ "message": "${AA25}" })`), {
    code: "UNKNOWN_ERROR",
    error: { message: AA25 },
  });

const makeClient = (sendTransaction = vi.fn(), getNonce = vi.fn()) => ({
  account: { getNonce },
  sendTransaction,
});

describe("isStuckNonceError", () => {
  it("matches AA25 at the top level and nested inside ethers wrappers", () => {
    expect(isStuckNonceError(new Error(AA25))).toBe(true);
    expect(isStuckNonceError(ethersWrapped())).toBe(true);
    expect(isStuckNonceError({ cause: { details: AA25 } })).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isStuckNonceError(new Error("AA23 reverted"))).toBe(false);
    expect(isStuckNonceError(new Error("User rejected the request"))).toBe(false);
    expect(isStuckNonceError(null)).toBe(false);
  });
});

describe("recoverStuckNonce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resends through the first alternate bundler that accepts the op", async () => {
    const primary = makeClient();
    const alternateSend = vi.fn().mockResolvedValue("0xalt");
    const build = vi.fn(() => ({ sendTransaction: alternateSend }));

    const hash = await recoverStuckNonce(TX, ethersWrapped(), {
      client: primary,
      chainId: 8453,
      alternateClients: [{ label: "PIMLICO", build }],
    });

    expect(hash).toBe("0xalt");
    expect(alternateSend).toHaveBeenCalledWith(expect.objectContaining({ to: TX.to, value: 0n }));
    expect(primary.sendTransaction).not.toHaveBeenCalled();
    expect(reportClientError).toHaveBeenCalledWith(
      "[ZeroDev] Recovered stuck nonce via alternate bundler",
      expect.anything(),
      expect.objectContaining({ bundler: "PIMLICO", chainId: 8453 })
    );
  });

  it("falls back to a fresh nonce key when every alternate also reports AA25", async () => {
    const getNonce = vi.fn().mockResolvedValue(123n);
    const primarySend = vi.fn().mockResolvedValue("0xfresh");
    const primary = makeClient(primarySend, getNonce);
    const build = vi.fn(() => ({ sendTransaction: vi.fn().mockRejectedValue(new Error(AA25)) }));

    const hash = await recoverStuckNonce(TX, new Error(AA25), {
      client: primary,
      chainId: 8453,
      alternateClients: [{ label: "PIMLICO", build }],
    });

    expect(hash).toBe("0xfresh");
    const [{ key }] = getNonce.mock.calls[0];
    expect(key).toBeGreaterThanOrEqual(1n);
    expect(key).toBeLessThanOrEqual(0xffffn);
    expect(primarySend).toHaveBeenCalledWith(expect.objectContaining({ nonce: 123n }));
  });

  it("rethrows a non-AA25 failure from an alternate bundler", async () => {
    const primary = makeClient();
    const build = () => ({
      sendTransaction: vi.fn().mockRejectedValue(new Error("AA21 didn't pay prefund")),
    });

    await expect(
      recoverStuckNonce(TX, new Error(AA25), {
        client: primary,
        chainId: 8453,
        alternateClients: [{ label: "PIMLICO", build }],
      })
    ).rejects.toThrow("AA21");
    expect(primary.sendTransaction).not.toHaveBeenCalled();
  });

  it("rethrows the original error when the account cannot derive a keyed nonce", async () => {
    const original = new Error(AA25);
    await expect(
      recoverStuckNonce(TX, original, {
        client: { sendTransaction: vi.fn() },
        chainId: 8453,
        alternateClients: [],
      })
    ).rejects.toBe(original);
  });
});

describe("withStuckNonceRecovery", () => {
  const options = () => ({
    client: makeClient(vi.fn().mockResolvedValue("0xfresh"), vi.fn().mockResolvedValue(1n)),
    chainId: 8453,
    alternateClients: [],
  });

  it("passes through successful sends and unrelated methods", async () => {
    const request = vi.fn().mockResolvedValue("0xok");
    const wrapped = withStuckNonceRecovery({ request }, options());

    await expect(wrapped.request({ method: "eth_chainId" })).resolves.toBe("0xok");
    await expect(wrapped.request({ method: "eth_sendTransaction", params: [TX] })).resolves.toBe(
      "0xok"
    );
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("recovers an eth_sendTransaction rejected with AA25", async () => {
    const request = vi.fn().mockRejectedValue(ethersWrapped());
    const opts = options();
    const wrapped = withStuckNonceRecovery({ request }, opts);

    await expect(wrapped.request({ method: "eth_sendTransaction", params: [TX] })).resolves.toBe(
      "0xfresh"
    );
    expect(opts.client.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("does not touch other rejections", async () => {
    const request = vi.fn().mockRejectedValue(new Error("User rejected"));
    const opts = options();
    const wrapped = withStuckNonceRecovery({ request }, opts);

    await expect(wrapped.request({ method: "eth_sendTransaction", params: [TX] })).rejects.toThrow(
      "User rejected"
    );
    expect(opts.client.sendTransaction).not.toHaveBeenCalled();
  });
});
