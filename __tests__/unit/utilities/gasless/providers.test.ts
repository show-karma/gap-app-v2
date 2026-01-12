/**
 * Tests for gasless provider registry and provider implementations.
 */

// Mock environment variables
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    ZERODEV_PROJECT_ID: "test-zerodev-project-id",
    ALCHEMY_POLICY_ID: "test-alchemy-policy-id",
    RPC: {
      OPTIMISM: "https://rpc.optimism.test",
      CELO: "https://rpc.celo.test",
    },
  },
}));

// Mock ZeroDev SDK
jest.mock("@zerodev/ecdsa-validator", () => ({
  signerToEcdsaValidator: jest.fn().mockResolvedValue({}),
}));

jest.mock("@zerodev/sdk", () => ({
  createKernelAccount: jest.fn().mockResolvedValue({
    address: "0x1234567890123456789012345678901234567890",
  }),
  createKernelAccountClient: jest.fn().mockReturnValue({
    account: {
      address: "0x1234567890123456789012345678901234567890",
    },
    getSupportedEntryPoints: jest
      .fn()
      .mockResolvedValue(["0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"]),
    sendUserOperation: jest.fn().mockResolvedValue({ hash: "0xmockhash" }),
    waitForUserOperationTransaction: jest.fn().mockResolvedValue("0xtxhash"),
  }),
  createZeroDevPaymasterClient: jest.fn().mockReturnValue({}),
}));

jest.mock("@zerodev/sdk/constants", () => ({
  getEntryPoint: jest.fn().mockReturnValue("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"),
  KERNEL_V3_3: "v3.3",
  KernelVersionToAddressesMap: {
    "v3.3": {
      accountImplementationAddress: "0xKernelImplementation",
    },
  },
}));

jest.mock("@zerodev/sdk/providers", () => ({
  KernelEIP1193Provider: jest.fn().mockImplementation(() => ({
    request: jest.fn(),
  })),
}));

// Mock Alchemy SDK
jest.mock("@aa-sdk/core", () => ({
  LocalAccountSigner: jest.fn().mockImplementation((account) => ({
    account,
    signMessage: jest.fn(),
  })),
}));

jest.mock("@account-kit/infra", () => ({
  alchemy: jest.fn().mockReturnValue({}),
  celoMainnet: { id: 42220, name: "Celo" },
}));

jest.mock("@account-kit/smart-contracts", () => ({
  createModularAccountV2Client: jest.fn().mockResolvedValue({
    account: {
      address: "0x1234567890123456789012345678901234567890",
    },
    sendUserOperation: jest.fn().mockResolvedValue({ hash: "0xmockhash" }),
    waitForUserOperationTransaction: jest.fn().mockResolvedValue("0xtxhash"),
  }),
}));

// Mock viem
jest.mock("viem", () => ({
  createPublicClient: jest.fn().mockReturnValue({}),
  http: jest.fn().mockReturnValue({}),
}));

// Mock ethers
jest.mock("ethers", () => ({
  BrowserProvider: jest.fn().mockImplementation(() => ({
    getSigner: jest.fn().mockResolvedValue({
      getAddress: jest.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
    }),
  })),
}));

import { celo, optimism } from "viem/chains";
import {
  AlchemyProvider,
  getProvider,
  getRegisteredProviders,
  ZeroDevProvider,
} from "@/utilities/gasless/providers";
import type { LocalAccountWithEIP7702 } from "@/utilities/gasless/types";
import { GaslessProviderError } from "@/utilities/gasless/types";

describe("Provider Registry", () => {
  describe("getProvider", () => {
    it("should return ZeroDev provider for zerodev type", () => {
      const provider = getProvider("zerodev");
      expect(provider).toBeDefined();
      expect(provider.name).toBe("zerodev");
    });

    it("should return Alchemy provider for alchemy type", () => {
      const provider = getProvider("alchemy");
      expect(provider).toBeDefined();
      expect(provider.name).toBe("alchemy");
    });

    it("should throw error for unknown provider type", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid provider type
        getProvider("unknown");
      }).toThrow("Unknown gasless provider: unknown");
    });
  });

  describe("getRegisteredProviders", () => {
    it("should return array of registered provider types", () => {
      const providers = getRegisteredProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toContain("zerodev");
      expect(providers).toContain("alchemy");
    });

    it("should return exactly 2 providers", () => {
      const providers = getRegisteredProviders();
      expect(providers.length).toBe(2);
    });
  });
});

describe("ZeroDevProvider", () => {
  let provider: ZeroDevProvider;
  let mockSigner: LocalAccountWithEIP7702;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new ZeroDevProvider();

    mockSigner = {
      address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      type: "local" as const,
      signMessage: jest.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signTypedData: jest.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signAuthorization: jest.fn().mockResolvedValue({
        contractAddress: "0xKernelImplementation" as `0x${string}`,
        address: "0xKernelImplementation" as `0x${string}`,
        chainId: optimism.id,
        nonce: 0,
        r: "0x1234" as `0x${string}`,
        s: "0x5678" as `0x${string}`,
        v: 28n,
        yParity: 1,
      }),
    };
  });

  describe("name", () => {
    it("should have name zerodev", () => {
      expect(provider.name).toBe("zerodev");
    });
  });

  describe("createClient", () => {
    it("should return null if no project ID configured", async () => {
      const config = {
        provider: "zerodev" as const,
        chain: optimism,
        rpcUrl: "https://rpc.optimism.test",
        enabled: true,
        zerodev: {
          projectId: "",
          useEIP7702: true,
        },
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await provider.createClient({
        chainId: optimism.id,
        signer: mockSigner,
        config,
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No project ID configured"));

      consoleSpy.mockRestore();
    });

    it("should return null if no RPC URL configured", async () => {
      const config = {
        provider: "zerodev" as const,
        chain: optimism,
        rpcUrl: "",
        enabled: true,
        zerodev: {
          projectId: "test-project-id",
          useEIP7702: true,
        },
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await provider.createClient({
        chainId: optimism.id,
        signer: mockSigner,
        config,
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No RPC URL configured"));

      consoleSpy.mockRestore();
    });

    it("should create EIP-7702 client when signer supports it", async () => {
      const config = {
        provider: "zerodev" as const,
        chain: optimism,
        rpcUrl: "https://rpc.optimism.test",
        enabled: true,
        zerodev: {
          projectId: "test-project-id",
          useEIP7702: true,
        },
      };

      const result = await provider.createClient({
        chainId: optimism.id,
        signer: mockSigner,
        config,
      });

      expect(result).not.toBeNull();
      expect(mockSigner.signAuthorization).toHaveBeenCalled();
    });

    it("should create regular client when EIP-7702 is disabled", async () => {
      const signerWithoutAuth = {
        ...mockSigner,
        signAuthorization: undefined,
      };

      const config = {
        provider: "zerodev" as const,
        chain: optimism,
        rpcUrl: "https://rpc.optimism.test",
        enabled: true,
        zerodev: {
          projectId: "test-project-id",
          useEIP7702: false,
        },
      };

      const result = await provider.createClient({
        chainId: optimism.id,
        signer: signerWithoutAuth,
        config,
      });

      expect(result).not.toBeNull();
    });
  });

  describe("toEthersSigner", () => {
    it("should convert client to ethers signer", async () => {
      const mockClient = {
        account: {
          address: "0x1234567890123456789012345678901234567890",
        },
        getSupportedEntryPoints: jest
          .fn()
          .mockResolvedValue(["0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"]),
      };

      const config = {
        provider: "zerodev" as const,
        chain: optimism,
        rpcUrl: "https://rpc.optimism.test",
        enabled: true,
      };

      const result = await provider.toEthersSigner(mockClient, optimism.id, config);

      expect(result).toBeDefined();
    });

    it("should throw GaslessProviderError when bundler validation fails critically", async () => {
      const mockClient = {
        account: {
          address: "0x1234567890123456789012345678901234567890",
        },
        getSupportedEntryPoints: jest.fn().mockResolvedValue([]),
      };

      const config = {
        provider: "zerodev" as const,
        chain: optimism,
        rpcUrl: "https://rpc.optimism.test",
        enabled: true,
      };

      await expect(provider.toEthersSigner(mockClient, optimism.id, config)).rejects.toThrow(
        GaslessProviderError
      );
    });
  });
});

describe("AlchemyProvider", () => {
  let provider: AlchemyProvider;
  let mockSigner: LocalAccountWithEIP7702;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new AlchemyProvider();

    mockSigner = {
      address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      type: "local" as const,
      signMessage: jest.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signTypedData: jest.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signAuthorization: jest.fn().mockResolvedValue({
        contractAddress: "0xImplementation" as `0x${string}`,
        address: "0xImplementation" as `0x${string}`,
        chainId: celo.id,
        nonce: 0,
        r: "0x1234" as `0x${string}`,
        s: "0x5678" as `0x${string}`,
        v: 28n,
        yParity: 1,
      }),
    };
  });

  describe("name", () => {
    it("should have name alchemy", () => {
      expect(provider.name).toBe("alchemy");
    });
  });

  describe("createClient", () => {
    it("should return null if no policy ID configured", async () => {
      const config = {
        provider: "alchemy" as const,
        chain: celo,
        rpcUrl: "https://rpc.celo.test",
        enabled: true,
        alchemy: {
          policyId: "",
        },
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await provider.createClient({
        chainId: celo.id,
        signer: mockSigner,
        config,
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No policy ID configured"));

      consoleSpy.mockRestore();
    });

    it("should return null if no RPC URL configured", async () => {
      const config = {
        provider: "alchemy" as const,
        chain: celo,
        rpcUrl: "",
        enabled: true,
        alchemy: {
          policyId: "test-policy-id",
        },
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await provider.createClient({
        chainId: celo.id,
        signer: mockSigner,
        config,
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No RPC URL configured"));

      consoleSpy.mockRestore();
    });

    it("should return null for unsupported chains", async () => {
      const config = {
        provider: "alchemy" as const,
        chain: optimism, // Optimism is not in Alchemy chain map
        rpcUrl: "https://rpc.optimism.test",
        enabled: true,
        alchemy: {
          policyId: "test-policy-id",
        },
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await provider.createClient({
        chainId: optimism.id,
        signer: mockSigner,
        config,
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("not mapped to Alchemy chain definition")
      );

      consoleSpy.mockRestore();
    });

    it("should return null if signer does not support signAuthorization", async () => {
      const signerWithoutAuth = {
        ...mockSigner,
        signAuthorization: undefined,
      };

      const config = {
        provider: "alchemy" as const,
        chain: celo,
        rpcUrl: "https://rpc.celo.test",
        enabled: true,
        alchemy: {
          policyId: "test-policy-id",
        },
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await provider.createClient({
        chainId: celo.id,
        signer: signerWithoutAuth,
        config,
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("does not support EIP-7702"));

      consoleSpy.mockRestore();
    });

    it("should create client for valid Celo configuration", async () => {
      const config = {
        provider: "alchemy" as const,
        chain: celo,
        rpcUrl: "https://rpc.celo.test",
        enabled: true,
        alchemy: {
          policyId: "test-policy-id",
        },
      };

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const result = await provider.createClient({
        chainId: celo.id,
        signer: mockSigner,
        config,
      });

      expect(result).not.toBeNull();
      // console.log is called with multiple arguments, so check the first one
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Alchemy] Creating EIP-7702 Modular Account V2 client for chain:",
        expect.any(Number)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("toEthersSigner", () => {
    it("should throw error if no RPC URL configured", async () => {
      const mockClient = {
        account: {
          address: "0x1234567890123456789012345678901234567890",
        },
      };

      const config = {
        provider: "alchemy" as const,
        chain: celo,
        rpcUrl: "",
        enabled: true,
      };

      await expect(provider.toEthersSigner(mockClient, celo.id, config)).rejects.toThrow(
        GaslessProviderError
      );
    });

    it("should create ethers signer for valid configuration", async () => {
      const mockClient = {
        account: {
          address: "0x1234567890123456789012345678901234567890",
        },
        sendUserOperation: jest.fn(),
        waitForUserOperationTransaction: jest.fn(),
      };

      const config = {
        provider: "alchemy" as const,
        chain: celo,
        rpcUrl: "https://rpc.celo.test",
        enabled: true,
      };

      const result = await provider.toEthersSigner(mockClient, celo.id, config);

      expect(result).toBeDefined();
    });
  });
});
