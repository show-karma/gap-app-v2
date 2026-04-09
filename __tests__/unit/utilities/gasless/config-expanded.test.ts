/**
 * Expanded tests for gasless/config.ts
 *
 * NOTE: The vitest config maps @/utilities/gasless/* to a mock module.
 * We bypass this by using a relative import path to the real module.
 * The envVars mock must be set up to provide test values.
 */

import { celo, lisk, mainnet, optimism, polygon, scroll, sei, sepolia } from "viem/chains";

// Mock envVars so the real config module gets test values
vi.mock("../../../../utilities/enviromentVars", () => ({
  envVars: {
    ZERODEV_PROJECT_ID: "test-zerodev-id",
    ALCHEMY_POLICY_ID: "test-alchemy-id",
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

// Use relative path to bypass the vitest alias that redirects @/utilities/gasless/* to mock
import {
  CHAIN_GASLESS_CONFIG,
  getChainGaslessConfig,
  getProviderForChain,
  getSupportedChainIds,
  isChainSupportedForGasless,
} from "../../../../utilities/gasless/config";

describe("Gasless Config - expanded edge cases", () => {
  describe("CHAIN_GASLESS_CONFIG structure", () => {
    it("should have enabled flag, provider, and chain for every entry", () => {
      for (const [chainIdStr, config] of Object.entries(CHAIN_GASLESS_CONFIG)) {
        const chainId = Number(chainIdStr);
        expect(config).toHaveProperty("enabled");
        expect(config).toHaveProperty("provider");
        expect(config).toHaveProperty("chain");
        expect(config.chain.id).toBe(chainId);
      }
    });

    it("should have zerodev config for all zerodev providers", () => {
      for (const config of Object.values(CHAIN_GASLESS_CONFIG)) {
        if (config.provider === "zerodev") {
          expect(config.zerodev).toBeDefined();
          expect(config.zerodev?.projectId).toBeTruthy();
        }
      }
    });

    it("should have alchemy config for all alchemy providers", () => {
      for (const config of Object.values(CHAIN_GASLESS_CONFIG)) {
        if (config.provider === "alchemy") {
          expect(config.alchemy).toBeDefined();
          expect(config.alchemy?.policyId).toBeTruthy();
        }
      }
    });
  });

  describe("isChainSupportedForGasless - edge cases", () => {
    it("should return false for a chain ID with no config entry", () => {
      expect(isChainSupportedForGasless(123456789)).toBe(false);
    });

    it("should return true for mainnet when ZeroDev ID is set", () => {
      expect(isChainSupportedForGasless(mainnet.id)).toBe(true);
    });

    it("should return true for testnet chains", () => {
      expect(isChainSupportedForGasless(sepolia.id)).toBe(true);
    });

    it("should return false for Lisk (disabled)", () => {
      expect(isChainSupportedForGasless(lisk.id)).toBe(false);
    });

    it("should return true for sei (ZeroDev)", () => {
      expect(isChainSupportedForGasless(sei.id)).toBe(true);
    });

    it("should return true for scroll (ZeroDev)", () => {
      expect(isChainSupportedForGasless(scroll.id)).toBe(true);
    });

    it("should return true for celo (Alchemy) when policy and rpcUrl are set", () => {
      expect(isChainSupportedForGasless(celo.id)).toBe(true);
    });
  });

  describe("getChainGaslessConfig - additional checks", () => {
    it("should return config with correct rpcUrl for Polygon", () => {
      const config = getChainGaslessConfig(polygon.id);
      expect(config).not.toBeNull();
      expect(config?.rpcUrl).toBe("https://rpc.polygon.test");
    });

    it("should return config with useEIP7702 for ZeroDev chains", () => {
      const config = getChainGaslessConfig(optimism.id);
      expect(config?.zerodev?.useEIP7702).toBe(true);
    });

    it("should return null for disabled chains", () => {
      expect(getChainGaslessConfig(lisk.id)).toBeNull();
    });

    it("should return null for unknown chains", () => {
      expect(getChainGaslessConfig(999999)).toBeNull();
    });
  });

  describe("getSupportedChainIds - completeness", () => {
    it("should include all enabled chains and exclude disabled", () => {
      const ids = getSupportedChainIds();

      expect(ids).not.toContain(lisk.id);

      const enabledConfigs = Object.entries(CHAIN_GASLESS_CONFIG)
        .filter(([, config]) => config.enabled)
        .map(([id]) => Number(id));

      enabledConfigs.forEach((id) => {
        expect(ids).toContain(id);
      });
    });

    it("should have consistent length with enabled configs", () => {
      const ids = getSupportedChainIds();
      const enabledCount = Object.values(CHAIN_GASLESS_CONFIG).filter((c) => c.enabled).length;
      expect(ids.length).toBe(enabledCount);
    });

    it("should return numbers", () => {
      const ids = getSupportedChainIds();
      ids.forEach((id) => {
        expect(typeof id).toBe("number");
      });
    });
  });

  describe("getProviderForChain - exhaustive", () => {
    it("should return alchemy for Celo", () => {
      expect(getProviderForChain(celo.id)).toBe("alchemy");
    });

    it("should return zerodev for ZeroDev chains", () => {
      expect(getProviderForChain(mainnet.id)).toBe("zerodev");
      expect(getProviderForChain(polygon.id)).toBe("zerodev");
      expect(getProviderForChain(sei.id)).toBe("zerodev");
      expect(getProviderForChain(scroll.id)).toBe("zerodev");
    });

    it("should return null for disabled chains", () => {
      expect(getProviderForChain(lisk.id)).toBeNull();
    });

    it("should return null for unknown chain IDs", () => {
      expect(getProviderForChain(0)).toBeNull();
      expect(getProviderForChain(-1)).toBeNull();
      expect(getProviderForChain(999999)).toBeNull();
    });
  });
});
