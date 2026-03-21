import { wrapSignerWithFallbackGas } from "@/utilities/fallback-gas-provider";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";

jest.mock("@/utilities/rpcClient", () => ({
  getRPCUrlByChainId: jest.fn(),
}));

const mockEstimateGas = jest.fn();
const mockFallbackEstimateGas = jest.fn();

jest.mock("ethers", () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    estimateGas: mockFallbackEstimateGas,
  })),
}));

const mockGetRPCUrlByChainId = getRPCUrlByChainId as jest.Mock;

function createMockSigner(estimateGasFn: jest.Mock) {
  return {
    provider: {
      estimateGas: estimateGasFn,
    },
  } as any;
}

describe("wrapSignerWithFallbackGas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should_return_original_signer_when_no_rpc_url_configured", async () => {
    mockGetRPCUrlByChainId.mockReturnValue(undefined);
    const signer = createMockSigner(mockEstimateGas);

    const result = await wrapSignerWithFallbackGas(signer, 42220);

    expect(result).toBe(signer);
  });

  it("should_use_original_estimateGas_when_it_succeeds", async () => {
    mockGetRPCUrlByChainId.mockReturnValue("https://forno.celo.org");
    mockEstimateGas.mockResolvedValue(100000n);
    const signer = createMockSigner(mockEstimateGas);
    const tx = { to: "0x123", data: "0x" };

    const wrapped = await wrapSignerWithFallbackGas(signer, 42220);
    const gas = await wrapped.provider.estimateGas(tx);

    expect(gas).toBe(100000n);
    expect(mockEstimateGas).toHaveBeenCalledWith(tx);
    expect(mockFallbackEstimateGas).not.toHaveBeenCalled();
  });

  it("should_fallback_to_configured_rpc_when_wallet_rpc_fails", async () => {
    mockGetRPCUrlByChainId.mockReturnValue("https://forno.celo.org");
    mockEstimateGas.mockRejectedValue(new Error("UNKNOWN_ERROR"));
    mockFallbackEstimateGas.mockResolvedValue(150000n);
    const signer = createMockSigner(mockEstimateGas);
    const tx = { to: "0x123", data: "0x" };

    const wrapped = await wrapSignerWithFallbackGas(signer, 42220);
    const gas = await wrapped.provider.estimateGas(tx);

    expect(gas).toBe(150000n);
    expect(mockEstimateGas).toHaveBeenCalledWith(tx);
    expect(mockFallbackEstimateGas).toHaveBeenCalledWith(tx);
  });

  it("should_throw_when_both_original_and_fallback_fail", async () => {
    mockGetRPCUrlByChainId.mockReturnValue("https://forno.celo.org");
    mockEstimateGas.mockRejectedValue(new Error("UNKNOWN_ERROR"));
    mockFallbackEstimateGas.mockRejectedValue(new Error("Fallback also failed"));
    const signer = createMockSigner(mockEstimateGas);
    const tx = { to: "0x123", data: "0x" };

    const wrapped = await wrapSignerWithFallbackGas(signer, 42220);

    await expect(wrapped.provider.estimateGas(tx)).rejects.toThrow("Fallback also failed");
  });
});
