import {
  getAllowedMoonPayCurrencies,
  getMoonPayCurrencyCode,
  isMoonPaySupported,
  toMoonPayNetworkName,
} from "@/utilities/moonpay";
import * as networkUtils from "@/utilities/network";

jest.mock("@/utilities/network");

describe("moonpay utilities", () => {
  describe("toMoonPayNetworkName", () => {
    it("should convert Ethereum mainnet (chainId 1) to 'ethereum'", () => {
      const result = toMoonPayNetworkName(1);
      expect(result).toBe("ethereum");
    });

    it("should use getChainNameById for Optimism (chainId 10)", () => {
      (networkUtils.getChainNameById as jest.Mock).mockReturnValue("optimism");

      const result = toMoonPayNetworkName(10);

      expect(networkUtils.getChainNameById).toHaveBeenCalledWith(10);
      expect(result).toBe("optimism");
    });

    it("should use getChainNameById for Arbitrum (chainId 42161)", () => {
      (networkUtils.getChainNameById as jest.Mock).mockReturnValue("arbitrum");

      const result = toMoonPayNetworkName(42161);

      expect(networkUtils.getChainNameById).toHaveBeenCalledWith(42161);
      expect(result).toBe("arbitrum");
    });

    it("should use getChainNameById for Base (chainId 8453)", () => {
      (networkUtils.getChainNameById as jest.Mock).mockReturnValue("base");

      const result = toMoonPayNetworkName(8453);

      expect(networkUtils.getChainNameById).toHaveBeenCalledWith(8453);
      expect(result).toBe("base");
    });

    it("should use getChainNameById for Polygon (chainId 137)", () => {
      (networkUtils.getChainNameById as jest.Mock).mockReturnValue("polygon");

      const result = toMoonPayNetworkName(137);

      expect(networkUtils.getChainNameById).toHaveBeenCalledWith(137);
      expect(result).toBe("polygon");
    });

    it("should use getChainNameById for Celo (chainId 42220)", () => {
      (networkUtils.getChainNameById as jest.Mock).mockReturnValue("celo");

      const result = toMoonPayNetworkName(42220);

      expect(networkUtils.getChainNameById).toHaveBeenCalledWith(42220);
      expect(result).toBe("celo");
    });
  });

  describe("getMoonPayCurrencyCode", () => {
    beforeEach(() => {
      (networkUtils.getChainNameById as jest.Mock).mockImplementation((chainId: number) => {
        const mapping: Record<number, string> = {
          1: "mainnet",
          10: "optimism",
          42161: "arbitrum",
          8453: "base",
          137: "polygon",
          42220: "celo",
        };
        return mapping[chainId] || "unknown";
      });
    });

    it("should return 'eth' for ETH on ethereum mainnet", () => {
      const result = getMoonPayCurrencyCode("ETH", "ethereum");
      expect(result).toBe("eth");
    });

    it("should return 'usdc' for USDC on ethereum mainnet", () => {
      const result = getMoonPayCurrencyCode("USDC", "ethereum");
      expect(result).toBe("usdc");
    });

    it("should return 'usdt' for USDT on ethereum mainnet", () => {
      const result = getMoonPayCurrencyCode("USDT", "ethereum");
      expect(result).toBe("usdt");
    });

    it("should return 'eth_optimism' for ETH on Optimism", () => {
      const result = getMoonPayCurrencyCode("ETH", "optimism");
      expect(result).toBe("eth_optimism");
    });

    it("should return 'eth_arbitrum' for ETH on Arbitrum", () => {
      const result = getMoonPayCurrencyCode("ETH", "arbitrum");
      expect(result).toBe("eth_arbitrum");
    });

    it("should return 'eth_base' for ETH on Base", () => {
      const result = getMoonPayCurrencyCode("ETH", "base");
      expect(result).toBe("eth_base");
    });

    it("should return 'usdc_optimism' for USDC on Optimism", () => {
      const result = getMoonPayCurrencyCode("USDC", "optimism");
      expect(result).toBe("usdc_optimism");
    });

    it("should return 'usdc_arbitrum' for USDC on Arbitrum", () => {
      const result = getMoonPayCurrencyCode("USDC", "arbitrum");
      expect(result).toBe("usdc_arbitrum");
    });

    it("should return 'usdc_base' for USDC on Base", () => {
      const result = getMoonPayCurrencyCode("USDC", "base");
      expect(result).toBe("usdc_base");
    });

    it("should return 'celo' for CELO on celo", () => {
      const result = getMoonPayCurrencyCode("CELO", "celo");
      expect(result).toBe("celo");
    });

    it("should return 'cusd' for CUSD on celo", () => {
      const result = getMoonPayCurrencyCode("CUSD", "celo");
      expect(result).toBe("cusd");
    });

    it("should return 'pol_polygon' for MATIC on polygon using custom currency code", () => {
      const result = getMoonPayCurrencyCode("MATIC", "polygon");
      expect(result).toBe("pol_polygon");
    });

    it("should handle lowercase input for crypto symbol", () => {
      const result = getMoonPayCurrencyCode("eth", "base");
      expect(result).toBe("eth_base");
    });

    it("should handle mixed case input for crypto symbol", () => {
      const result = getMoonPayCurrencyCode("UsD c", "optimism");
      expect(result).toBe("usd c_optimism");
    });
  });

  describe("isMoonPaySupported", () => {
    it("should return true for ETH on Ethereum mainnet", () => {
      const result = isMoonPaySupported("ETH", 1);
      expect(result).toBe(true);
    });

    it("should return true for USDC on Ethereum mainnet", () => {
      const result = isMoonPaySupported("USDC", 1);
      expect(result).toBe(true);
    });

    it("should return true for USDT on Ethereum mainnet", () => {
      const result = isMoonPaySupported("USDT", 1);
      expect(result).toBe(true);
    });

    it("should return true for ETH on Optimism", () => {
      const result = isMoonPaySupported("ETH", 10);
      expect(result).toBe(true);
    });

    it("should return true for USDC on Base", () => {
      const result = isMoonPaySupported("USDC", 8453);
      expect(result).toBe(true);
    });

    it("should return true for CELO on Celo", () => {
      const result = isMoonPaySupported("CELO", 42220);
      expect(result).toBe(true);
    });

    it("should return true for cUSD on Celo", () => {
      const result = isMoonPaySupported("cUSD", 42220);
      expect(result).toBe(true);
    });

    it("should return true for MATIC on Polygon", () => {
      const result = isMoonPaySupported("MATIC", 137);
      expect(result).toBe(true);
    });

    it("should return false for USDGLO (not MoonPay supported)", () => {
      const result = isMoonPaySupported("USDGLO", 1);
      expect(result).toBe(false);
    });

    it("should return false for WETH (not MoonPay supported)", () => {
      const result = isMoonPaySupported("WETH", 1);
      expect(result).toBe(false);
    });

    it("should return false for token not in SUPPORTED_TOKENS", () => {
      const result = isMoonPaySupported("WBTC", 1);
      expect(result).toBe(false);
    });

    it("should return false for token on wrong chain", () => {
      const result = isMoonPaySupported("ETH", 999);
      expect(result).toBe(false);
    });

    it("should return false for token on unsupported chain even if in SUPPORTED_TOKENS", () => {
      const result = isMoonPaySupported("USDC", 999);
      expect(result).toBe(false);
    });
  });

  describe("getAllowedMoonPayCurrencies", () => {
    beforeEach(() => {
      (networkUtils.getChainNameById as jest.Mock).mockImplementation((chainId: number) => {
        const mapping: Record<number, string> = {
          1: "mainnet",
          10: "optimism",
          42161: "arbitrum",
          8453: "base",
          137: "polygon",
          42220: "celo",
        };
        return mapping[chainId] || "unknown";
      });
    });

    it("should return comma-separated list of MoonPay currency codes", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(typeof result).toBe("string");
      expect(result).toContain("eth");
      expect(result).toContain("usdc");
    });

    it("should include ETH variants for all supported chains", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(result).toContain("eth");
      expect(result).toContain("eth_optimism");
      expect(result).toContain("eth_arbitrum");
      expect(result).toContain("eth_base");
    });

    it("should include USDC variants for all supported chains", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(result).toContain("usdc");
      expect(result).toContain("usdc_optimism");
      expect(result).toContain("usdc_arbitrum");
      expect(result).toContain("usdc_base");
    });

    it("should include USDT variants", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(result).toContain("usdt");
      expect(result).toContain("usdt_optimism");
      expect(result).toContain("usdt_arbitrum");
    });

    it("should include Celo native tokens", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(result).toContain("celo");
      expect(result).toContain("cusd");
    });

    it("should include USDC on Celo", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(result).toContain("usdc_celo");
    });

    it("should include pol_polygon for MATIC", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(result).toContain("pol_polygon");
    });

    it("should not include USDGLO (not MoonPay supported)", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(result).not.toContain("usdglo");
    });

    it("should not include WETH (not MoonPay supported)", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(result).not.toContain("weth");
    });

    it("should return sorted comma-separated string", () => {
      const result = getAllowedMoonPayCurrencies();
      const currencies = result.split(",");
      const sortedCurrencies = [...currencies].sort();

      expect(currencies).toEqual(sortedCurrencies);
    });

    it("should not contain duplicate currencies", () => {
      const result = getAllowedMoonPayCurrencies();
      const currencies = result.split(",");
      const uniqueCurrencies = [...new Set(currencies)];

      expect(currencies.length).toBe(uniqueCurrencies.length);
    });

    it("should derive all currencies from SUPPORTED_TOKENS", () => {
      const result = getAllowedMoonPayCurrencies();

      expect(result.length).toBeGreaterThan(0);

      const currencies = result.split(",");

      expect(currencies.every((c) => typeof c === "string" && c.length > 0)).toBe(true);
    });
  });
});
