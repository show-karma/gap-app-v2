/**
 * Tests for gasless module mock API.
 * Since the real gasless module uses ESM-only packages that Jest can't transform,
 * these tests verify the mock behavior and integration patterns.
 *
 * Note: The actual implementation is mocked via moduleNameMapper in jest.config.ts.
 * These tests verify:
 * 1. Mock exports are correctly defined
 * 2. Mock functions can be configured for different test scenarios
 * 3. GaslessProviderError class works correctly
 */

// The gasless module is mocked globally in tests/setup.js
// This test verifies the mock works correctly and can be configured

import { celo, lisk, optimism } from "viem/chains";
import {
  createGaslessClient,
  createPrivySignerForGasless,
  GaslessProviderError,
  getChainGaslessConfig,
  getGaslessSigner,
  getProvider,
  isChainSupportedForGasless,
} from "@/utilities/gasless";

// Type for mock signer
interface MockSigner {
  address: `0x${string}`;
  type: "local";
  signMessage: jest.Mock;
  signTypedData: jest.Mock;
  signAuthorization: jest.Mock;
}

describe("Gasless Module Mock API", () => {
  let mockSigner: MockSigner;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSigner = {
      address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      type: "local" as const,
      signMessage: jest.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signTypedData: jest.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signAuthorization: jest.fn().mockResolvedValue({
        contractAddress: "0xImplementation" as `0x${string}`,
        address: "0xImplementation" as `0x${string}`,
        chainId: optimism.id,
        nonce: 0,
        r: "0x1234" as `0x${string}`,
        s: "0x5678" as `0x${string}`,
        v: 28n,
        yParity: 1,
      }),
    };
  });

  describe("Mock Exports", () => {
    it("should export createGaslessClient as a mock function", () => {
      expect(createGaslessClient).toBeDefined();
      expect(jest.isMockFunction(createGaslessClient)).toBe(true);
    });

    it("should export getGaslessSigner as a mock function", () => {
      expect(getGaslessSigner).toBeDefined();
      expect(jest.isMockFunction(getGaslessSigner)).toBe(true);
    });

    it("should export isChainSupportedForGasless as a mock function", () => {
      expect(isChainSupportedForGasless).toBeDefined();
      expect(jest.isMockFunction(isChainSupportedForGasless)).toBe(true);
    });

    it("should export getChainGaslessConfig as a mock function", () => {
      expect(getChainGaslessConfig).toBeDefined();
      expect(jest.isMockFunction(getChainGaslessConfig)).toBe(true);
    });

    it("should export createPrivySignerForGasless as a mock function", () => {
      expect(createPrivySignerForGasless).toBeDefined();
      expect(jest.isMockFunction(createPrivySignerForGasless)).toBe(true);
    });

    it("should export getProvider as a mock function", () => {
      expect(getProvider).toBeDefined();
      expect(jest.isMockFunction(getProvider)).toBe(true);
    });

    it("should export GaslessProviderError class", () => {
      expect(GaslessProviderError).toBeDefined();
      const error = new GaslessProviderError("Test error", "zerodev", 10);
      expect(error.name).toBe("GaslessProviderError");
      expect(error.provider).toBe("zerodev");
      expect(error.chainId).toBe(10);
    });
  });

  describe("createGaslessClient", () => {
    it("should be callable with chain ID and signer", async () => {
      const result = await createGaslessClient(optimism.id, mockSigner);

      expect(createGaslessClient).toHaveBeenCalledWith(optimism.id, mockSigner);
      // Default mock returns null
      expect(result).toBeNull();
    });

    it("should be configurable to return a mock client for supported chains", async () => {
      const mockClient = {
        account: { address: "0x1234567890123456789012345678901234567890" },
        sendUserOperation: jest.fn(),
      };

      (createGaslessClient as jest.Mock).mockResolvedValueOnce(mockClient);

      const result = await createGaslessClient(optimism.id, mockSigner);

      expect(result).toBe(mockClient);
    });

    it("should be configurable to return null for unsupported chains", async () => {
      (createGaslessClient as jest.Mock).mockResolvedValueOnce(null);

      const result = await createGaslessClient(999999, mockSigner);

      expect(result).toBeNull();
    });

    it("should be configurable to return null for disabled chains", async () => {
      (createGaslessClient as jest.Mock).mockResolvedValueOnce(null);

      const result = await createGaslessClient(lisk.id, mockSigner);

      expect(result).toBeNull();
    });
  });

  describe("getGaslessSigner", () => {
    const mockClient = {
      account: { address: "0x1234567890123456789012345678901234567890" },
    };

    it("should be callable with client and chain ID", async () => {
      await getGaslessSigner(mockClient, optimism.id);

      expect(getGaslessSigner).toHaveBeenCalledWith(mockClient, optimism.id);
    });

    it("should be configurable to return a mock ethers signer", async () => {
      const mockEthersSigner = {
        getAddress: jest.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
        signMessage: jest.fn(),
      };

      (getGaslessSigner as jest.Mock).mockResolvedValueOnce(mockEthersSigner);

      const result = await getGaslessSigner(mockClient, optimism.id);

      expect(result).toBe(mockEthersSigner);
    });

    it("should be configurable to throw GaslessProviderError for unsupported chains", async () => {
      (getGaslessSigner as jest.Mock).mockRejectedValueOnce(
        new GaslessProviderError("Chain 999999 is not supported", "zerodev", 999999)
      );

      await expect(getGaslessSigner(mockClient, 999999)).rejects.toThrow(GaslessProviderError);
    });

    it("should be configurable to throw GaslessProviderError for disabled chains", async () => {
      (getGaslessSigner as jest.Mock).mockRejectedValueOnce(
        new GaslessProviderError("Chain is disabled", "zerodev", lisk.id)
      );

      await expect(getGaslessSigner(mockClient, lisk.id)).rejects.toThrow(GaslessProviderError);
    });
  });

  describe("getProvider", () => {
    it("should return a provider object for zerodev", () => {
      const provider = getProvider("zerodev");

      expect(provider).toBeDefined();
      expect(provider.name).toBe("zerodev");
      expect(typeof provider.createClient).toBe("function");
      expect(typeof provider.toEthersSigner).toBe("function");
    });

    it("should return a provider object for alchemy", () => {
      const provider = getProvider("alchemy");

      expect(provider).toBeDefined();
      expect(provider.name).toBe("alchemy");
      expect(typeof provider.createClient).toBe("function");
      expect(typeof provider.toEthersSigner).toBe("function");
    });

    it("should have createClient that returns a mock smart account client", async () => {
      const provider = getProvider("zerodev");
      const client = await provider.createClient({
        chainId: optimism.id,
        signer: mockSigner,
        config: { rpcUrl: "https://rpc.test" },
      });

      expect(client).toBeDefined();
      expect(client.account).toBeDefined();
      expect(client.account.address).toBe("0x1234567890123456789012345678901234567890");
    });

    it("should have toEthersSigner that returns a mock signer", async () => {
      const provider = getProvider("zerodev");
      const mockClient = { account: { address: "0x123" } };
      const signer = await provider.toEthersSigner(mockClient, optimism.id, {});

      expect(signer).toBeDefined();
      expect(typeof signer.getAddress).toBe("function");
    });
  });

  describe("isChainSupportedForGasless", () => {
    it("should be configurable to return true for supported chains", () => {
      (isChainSupportedForGasless as jest.Mock).mockReturnValueOnce(true);

      const result = isChainSupportedForGasless(optimism.id);

      expect(result).toBe(true);
    });

    it("should be configurable to return false for unsupported chains", () => {
      (isChainSupportedForGasless as jest.Mock).mockReturnValueOnce(false);

      const result = isChainSupportedForGasless(999999);

      expect(result).toBe(false);
    });
  });

  describe("getChainGaslessConfig", () => {
    it("should be configurable to return config for supported chains", () => {
      const mockConfig = {
        rpcUrl: "https://rpc.optimism.test",
        paymasterUrl: "https://paymaster.test",
      };

      (getChainGaslessConfig as jest.Mock).mockReturnValueOnce(mockConfig);

      const result = getChainGaslessConfig(optimism.id);

      expect(result).toBe(mockConfig);
    });

    it("should be configurable to return null for unsupported chains", () => {
      (getChainGaslessConfig as jest.Mock).mockReturnValueOnce(null);

      const result = getChainGaslessConfig(999999);

      expect(result).toBeNull();
    });
  });
});

describe("GaslessProviderError", () => {
  it("should create error with all properties", () => {
    const originalError = new Error("Original error");
    const error = new GaslessProviderError("Test error message", "alchemy", 42220, originalError);

    expect(error.message).toBe("Test error message");
    expect(error.name).toBe("GaslessProviderError");
    expect(error.provider).toBe("alchemy");
    expect(error.chainId).toBe(42220);
    expect(error.originalError).toBe(originalError);
  });

  it("should create error without original error", () => {
    const error = new GaslessProviderError("Test error", "zerodev", 10);

    expect(error.message).toBe("Test error");
    expect(error.originalError).toBeUndefined();
  });

  it("should be instanceof Error", () => {
    const error = new GaslessProviderError("Test", "zerodev", 10);

    expect(error instanceof Error).toBe(true);
    expect(error instanceof GaslessProviderError).toBe(true);
  });

  it("should be throwable and catchable", async () => {
    const throwError = async () => {
      throw new GaslessProviderError("Test throw", "alchemy", celo.id);
    };

    await expect(throwError()).rejects.toThrow(GaslessProviderError);
    await expect(throwError()).rejects.toThrow("Test throw");
  });

  it("should preserve stack trace", () => {
    const error = new GaslessProviderError("Stack test", "zerodev", 10);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("GaslessProviderError");
  });
});
