/**
 * Tests for gasless provider registry and provider implementations.
 */

// Mock environment variables
vi.mock("@/utilities/enviromentVars", () => ({
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
vi.mock("@zerodev/ecdsa-validator", () => ({
  signerToEcdsaValidator: vi.fn().mockResolvedValue({}),
}));

vi.mock("@zerodev/sdk", () => ({
  createKernelAccount: vi.fn().mockResolvedValue({
    address: "0x1234567890123456789012345678901234567890",
  }),
  createKernelAccountClient: vi.fn().mockReturnValue({
    account: {
      address: "0x1234567890123456789012345678901234567890",
    },
    getSupportedEntryPoints: vi
      .fn()
      .mockResolvedValue(["0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"]),
    sendUserOperation: vi.fn().mockResolvedValue({ hash: "0xmockhash" }),
    waitForUserOperationTransaction: vi.fn().mockResolvedValue("0xtxhash"),
  }),
  createZeroDevPaymasterClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@zerodev/sdk/constants", () => ({
  getEntryPoint: vi.fn().mockReturnValue("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"),
  KERNEL_V3_3: "v3.3",
  KernelVersionToAddressesMap: {
    "v3.3": {
      accountImplementationAddress: "0xKernelImplementation",
    },
  },
}));

vi.mock("@zerodev/sdk/providers", () => ({
  KernelEIP1193Provider: class MockKernelEIP1193Provider {
    request = vi.fn();
  },
}));

// Mock Alchemy SDK
vi.mock("@aa-sdk/core", () => ({
  LocalAccountSigner: class MockLocalAccountSigner {
    account: unknown;
    signMessage = vi.fn();
    constructor(account: unknown) {
      this.account = account;
    }
  },
}));

vi.mock("@account-kit/infra", () => ({
  alchemy: vi.fn().mockReturnValue({}),
  celoMainnet: { id: 42220, name: "Celo" },
}));

vi.mock("@account-kit/smart-contracts", () => ({
  createModularAccountV2Client: vi.fn().mockResolvedValue({
    account: {
      address: "0x1234567890123456789012345678901234567890",
    },
    sendUserOperation: vi.fn().mockResolvedValue({ hash: "0xmockhash" }),
    waitForUserOperationTransaction: vi.fn().mockResolvedValue("0xtxhash"),
  }),
}));

// Mock viem
vi.mock("viem", () => ({
  createPublicClient: vi.fn().mockReturnValue({}),
  http: vi.fn().mockReturnValue({}),
}));

// Mock ethers
vi.mock("ethers", () => ({
  BrowserProvider: class MockBrowserProvider {
    getSigner = vi.fn().mockResolvedValue({
      getAddress: vi.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
    });
  },
}));

import { celo, optimism } from "viem/chains";
import { getProvider, getRegisteredProviders } from "@/utilities/gasless/providers";
import { AlchemyProvider } from "@/utilities/gasless/providers/alchemy.provider";
import { ZeroDevProvider } from "@/utilities/gasless/providers/zerodev.provider";
import type { LocalAccountWithEIP7702 } from "@/utilities/gasless/types";
import { GaslessProviderError } from "@/utilities/gasless/types";

describe("Provider Registry", () => {
  describe("getProvider", () => {
    it("should return ZeroDev provider for zerodev type", async () => {
      const provider = await getProvider("zerodev");
      expect(provider).toBeDefined();
      expect(provider.name).toBe("zerodev");
    });

    it("should return Alchemy provider for alchemy type", async () => {
      const provider = await getProvider("alchemy");
      expect(provider).toBeDefined();
      expect(provider.name).toBe("alchemy");
    });

    it("should throw error for unknown provider type", async () => {
      await expect(
        // @ts-expect-error - Testing invalid provider type
        getProvider("unknown")
      ).rejects.toThrow("Unknown gasless provider: unknown");
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
    vi.clearAllMocks();
    provider = new ZeroDevProvider();

    mockSigner = {
      address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      type: "local" as const,
      signMessage: vi.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signTypedData: vi.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signAuthorization: vi.fn().mockResolvedValue({
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

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

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

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

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
        getSupportedEntryPoints: vi
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
        getSupportedEntryPoints: vi.fn().mockResolvedValue([]),
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
    vi.clearAllMocks();
    provider = new AlchemyProvider();

    mockSigner = {
      address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      type: "local" as const,
      signMessage: vi.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signTypedData: vi.fn().mockResolvedValue("0xsignature" as `0x${string}`),
      signAuthorization: vi.fn().mockResolvedValue({
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

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

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

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

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

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

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

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

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

      const result = await provider.createClient({
        chainId: celo.id,
        signer: mockSigner,
        config,
      });

      expect(result).not.toBeNull();
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
        sendUserOperation: vi.fn(),
        waitForUserOperationTransaction: vi.fn(),
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
