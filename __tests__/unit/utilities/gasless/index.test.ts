/**
 * Tests for main gasless module API.
 * Verifies createGaslessClient and getGaslessSigner functions.
 */

import { celo, lisk, optimism } from "viem/chains";

// Mock environment variables
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    ZERODEV_PROJECT_ID: "test-zerodev-project-id",
    ALCHEMY_POLICY_ID: "test-alchemy-policy-id",
    RPC: {
      OPTIMISM: "https://rpc.optimism.test",
      ARBITRUM: "https://rpc.arbitrum.test",
      BASE: "https://rpc.base.test",
      MAINNET: "https://rpc.mainnet.test",
      POLYGON: "https://rpc.polygon.test",
      CELO: "https://rpc.celo.test",
      SCROLL: "https://rpc.scroll.test",
      SEI: "https://rpc.sei.test",
      LISK: "https://rpc.lisk.test",
      OPT_SEPOLIA: "https://rpc.opt-sepolia.test",
      BASE_SEPOLIA: "https://rpc.base-sepolia.test",
      SEPOLIA: "https://rpc.sepolia.test",
    },
  },
}));

// Mock the providers
const mockZeroDevClient = {
  account: {
    address: "0x1234567890123456789012345678901234567890",
  },
  getSupportedEntryPoints: jest
    .fn()
    .mockResolvedValue(["0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"]),
};

const mockAlchemyClient = {
  account: {
    address: "0x1234567890123456789012345678901234567890",
  },
  sendUserOperation: jest.fn(),
  waitForUserOperationTransaction: jest.fn(),
};

const mockEthersSigner = {
  getAddress: jest.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
};

jest.mock("@/utilities/gasless/providers", () => ({
  getProvider: jest.fn((type: string) => {
    if (type === "zerodev") {
      return {
        name: "zerodev",
        createClient: jest.fn().mockResolvedValue(mockZeroDevClient),
        toEthersSigner: jest.fn().mockResolvedValue(mockEthersSigner),
      };
    }
    if (type === "alchemy") {
      return {
        name: "alchemy",
        createClient: jest.fn().mockResolvedValue(mockAlchemyClient),
        toEthersSigner: jest.fn().mockResolvedValue(mockEthersSigner),
      };
    }
    throw new Error(`Unknown gasless provider: ${type}`);
  }),
}));

import {
  createGaslessClient,
  getChainGaslessConfig,
  getGaslessSigner,
  isChainSupportedForGasless,
} from "@/utilities/gasless";
import { getProvider } from "@/utilities/gasless/providers";
import type { LocalAccountWithEIP7702 } from "@/utilities/gasless/types";
import { GaslessProviderError } from "@/utilities/gasless/types";

describe("Gasless Module API", () => {
  let mockSigner: LocalAccountWithEIP7702;

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

  describe("Re-exports", () => {
    it("should re-export isChainSupportedForGasless", () => {
      expect(typeof isChainSupportedForGasless).toBe("function");
    });

    it("should re-export getChainGaslessConfig", () => {
      expect(typeof getChainGaslessConfig).toBe("function");
    });

    it("should re-export GaslessProviderError", () => {
      expect(GaslessProviderError).toBeDefined();
      const error = new GaslessProviderError("Test error", "zerodev", 10);
      expect(error.name).toBe("GaslessProviderError");
      expect(error.provider).toBe("zerodev");
      expect(error.chainId).toBe(10);
    });
  });

  describe("createGaslessClient", () => {
    it("should create client for ZeroDev chains", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const client = await createGaslessClient(optimism.id, mockSigner);

      expect(client).not.toBeNull();
      expect(getProvider).toHaveBeenCalledWith("zerodev");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Creating client for chain 10 using zerodev provider")
      );

      consoleSpy.mockRestore();
    });

    it("should create client for Alchemy chains", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const client = await createGaslessClient(celo.id, mockSigner);

      expect(client).not.toBeNull();
      expect(getProvider).toHaveBeenCalledWith("alchemy");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Creating client for chain 42220 using alchemy provider")
      );

      consoleSpy.mockRestore();
    });

    it("should return null for unsupported chains", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const client = await createGaslessClient(999999, mockSigner);

      expect(client).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Chain 999999 is not supported")
      );

      consoleSpy.mockRestore();
    });

    it("should return null for disabled chains", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Lisk is disabled in the config
      const client = await createGaslessClient(lisk.id, mockSigner);

      expect(client).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("not supported"));

      consoleSpy.mockRestore();
    });
  });

  describe("getGaslessSigner", () => {
    it("should convert client to ethers signer for ZeroDev chains", async () => {
      const signer = await getGaslessSigner(mockZeroDevClient, optimism.id);

      expect(signer).toBe(mockEthersSigner);
      expect(getProvider).toHaveBeenCalledWith("zerodev");
    });

    it("should convert client to ethers signer for Alchemy chains", async () => {
      const signer = await getGaslessSigner(mockAlchemyClient, celo.id);

      expect(signer).toBe(mockEthersSigner);
      expect(getProvider).toHaveBeenCalledWith("alchemy");
    });

    it("should throw GaslessProviderError for unsupported chains", async () => {
      await expect(getGaslessSigner(mockZeroDevClient, 999999)).rejects.toThrow(
        GaslessProviderError
      );
    });

    it("should throw GaslessProviderError for disabled chains", async () => {
      await expect(getGaslessSigner(mockZeroDevClient, lisk.id)).rejects.toThrow(
        GaslessProviderError
      );
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
});
