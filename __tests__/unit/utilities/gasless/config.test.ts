/**
 * Tests for gasless configuration module.
 * Verifies chain support, provider selection, and configuration retrieval.
 */

import { arbitrum, base, celo, lisk, optimism, scroll, sepolia } from "viem/chains";

// Mock environment variables BEFORE importing the config
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

// Import AFTER mocks
import {
  ALCHEMY_POLICY_ID,
  CHAIN_GASLESS_CONFIG,
  getChainGaslessConfig,
  getProviderForChain,
  getSupportedChainIds,
  isChainSupportedForGasless,
  ZERODEV_PROJECT_ID,
} from "@/utilities/gasless/config";

describe("Gasless Config", () => {
  describe("Constants", () => {
    it("should have ZERODEV_PROJECT_ID from env", () => {
      expect(ZERODEV_PROJECT_ID).toBe("test-zerodev-project-id");
    });

    it("should have ALCHEMY_POLICY_ID from env", () => {
      expect(ALCHEMY_POLICY_ID).toBe("test-alchemy-policy-id");
    });
  });

  describe("CHAIN_GASLESS_CONFIG", () => {
    it("should have configuration for Optimism (ZeroDev)", () => {
      const config = CHAIN_GASLESS_CONFIG[optimism.id];
      expect(config).toBeDefined();
      expect(config.provider).toBe("zerodev");
      expect(config.chain.id).toBe(optimism.id);
      expect(config.enabled).toBe(true);
      expect(config.zerodev?.useEIP7702).toBe(true);
    });

    it("should have configuration for Celo (Alchemy)", () => {
      const config = CHAIN_GASLESS_CONFIG[celo.id];
      expect(config).toBeDefined();
      expect(config.provider).toBe("alchemy");
      expect(config.chain.id).toBe(celo.id);
      expect(config.enabled).toBe(true);
      expect(config.alchemy?.policyId).toBe("test-alchemy-policy-id");
    });

    it("should have configuration for Arbitrum (ZeroDev)", () => {
      const config = CHAIN_GASLESS_CONFIG[arbitrum.id];
      expect(config).toBeDefined();
      expect(config.provider).toBe("zerodev");
      expect(config.enabled).toBe(true);
    });

    it("should have configuration for Base (ZeroDev)", () => {
      const config = CHAIN_GASLESS_CONFIG[base.id];
      expect(config).toBeDefined();
      expect(config.provider).toBe("zerodev");
      expect(config.enabled).toBe(true);
    });

    it("should have configuration for Scroll (ZeroDev)", () => {
      const config = CHAIN_GASLESS_CONFIG[scroll.id];
      expect(config).toBeDefined();
      expect(config.provider).toBe("zerodev");
      expect(config.enabled).toBe(true);
    });

    it("should have Lisk disabled by default", () => {
      const config = CHAIN_GASLESS_CONFIG[lisk.id];
      expect(config).toBeDefined();
      expect(config.enabled).toBe(false);
    });

    it("should have configuration for Sepolia testnet", () => {
      const config = CHAIN_GASLESS_CONFIG[sepolia.id];
      expect(config).toBeDefined();
      expect(config.provider).toBe("zerodev");
      expect(config.enabled).toBe(true);
    });
  });

  describe("isChainSupportedForGasless", () => {
    it("should return true for enabled chains with valid config", () => {
      expect(isChainSupportedForGasless(optimism.id)).toBe(true);
      expect(isChainSupportedForGasless(arbitrum.id)).toBe(true);
      expect(isChainSupportedForGasless(base.id)).toBe(true);
      expect(isChainSupportedForGasless(celo.id)).toBe(true);
    });

    it("should return false for disabled chains", () => {
      expect(isChainSupportedForGasless(lisk.id)).toBe(false);
    });

    it("should return false for unknown chain IDs", () => {
      expect(isChainSupportedForGasless(999999)).toBe(false);
    });
  });

  describe("getChainGaslessConfig", () => {
    it("should return config for supported chains", () => {
      const config = getChainGaslessConfig(optimism.id);
      expect(config).not.toBeNull();
      expect(config?.provider).toBe("zerodev");
      expect(config?.chain.id).toBe(optimism.id);
    });

    it("should return config for Alchemy chains", () => {
      const config = getChainGaslessConfig(celo.id);
      expect(config).not.toBeNull();
      expect(config?.provider).toBe("alchemy");
      expect(config?.alchemy?.policyId).toBe("test-alchemy-policy-id");
    });

    it("should return null for disabled chains", () => {
      const config = getChainGaslessConfig(lisk.id);
      expect(config).toBeNull();
    });

    it("should return null for unknown chains", () => {
      const config = getChainGaslessConfig(999999);
      expect(config).toBeNull();
    });
  });

  describe("getProviderForChain", () => {
    it("should return zerodev for ZeroDev chains", () => {
      expect(getProviderForChain(optimism.id)).toBe("zerodev");
      expect(getProviderForChain(arbitrum.id)).toBe("zerodev");
      expect(getProviderForChain(base.id)).toBe("zerodev");
    });

    it("should return alchemy for Alchemy chains", () => {
      expect(getProviderForChain(celo.id)).toBe("alchemy");
    });

    it("should return null for disabled chains", () => {
      expect(getProviderForChain(lisk.id)).toBeNull();
    });

    it("should return null for unknown chains", () => {
      expect(getProviderForChain(999999)).toBeNull();
    });
  });

  describe("getSupportedChainIds", () => {
    it("should return array of enabled chain IDs", () => {
      const chainIds = getSupportedChainIds();
      expect(Array.isArray(chainIds)).toBe(true);
      expect(chainIds.length).toBeGreaterThan(0);
    });

    it("should include enabled chains", () => {
      const chainIds = getSupportedChainIds();
      expect(chainIds).toContain(optimism.id);
      expect(chainIds).toContain(celo.id);
      expect(chainIds).toContain(arbitrum.id);
    });

    it("should not include disabled chains", () => {
      const chainIds = getSupportedChainIds();
      expect(chainIds).not.toContain(lisk.id);
    });

    it("should return numbers", () => {
      const chainIds = getSupportedChainIds();
      chainIds.forEach((id) => {
        expect(typeof id).toBe("number");
      });
    });
  });
});

describe("Gasless Config - Missing Environment Variables", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should handle missing ZERODEV_PROJECT_ID", async () => {
    jest.doMock("@/utilities/enviromentVars", () => ({
      envVars: {
        ZERODEV_PROJECT_ID: "",
        ALCHEMY_POLICY_ID: "test-policy",
        RPC: {
          OPTIMISM: "https://rpc.optimism.test",
          CELO: "https://rpc.celo.test",
        },
      },
    }));

    const { isChainSupportedForGasless: checkSupport } = await import("@/utilities/gasless/config");

    // ZeroDev chains should not be supported without project ID
    expect(checkSupport(optimism.id)).toBe(false);
    // Alchemy chains should still work
    expect(checkSupport(celo.id)).toBe(true);
  });

  it("should handle missing ALCHEMY_POLICY_ID", async () => {
    jest.doMock("@/utilities/enviromentVars", () => ({
      envVars: {
        ZERODEV_PROJECT_ID: "test-project",
        ALCHEMY_POLICY_ID: "",
        RPC: {
          OPTIMISM: "https://rpc.optimism.test",
          CELO: "https://rpc.celo.test",
        },
      },
    }));

    const { isChainSupportedForGasless: checkSupport } = await import("@/utilities/gasless/config");

    // ZeroDev chains should still work
    expect(checkSupport(optimism.id)).toBe(true);
    // Alchemy chains should not be supported without policy ID
    expect(checkSupport(celo.id)).toBe(false);
  });
});
