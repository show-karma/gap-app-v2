/**
 * @file Tests for donation helper utilities
 * @description Tests donation-related utility functions for formatting, validation, and calculations
 */

import {
  getTokenBalanceKey,
  getTokenKey,
  formatDonationAmount,
  parseDonationAmount,
  validateDonationAmount,
  hasSufficientBalance,
  groupPaymentsByChain,
  countUniqueNetworks,
  getUniqueChainIds,
  countNetworkSwitches,
  calculateTotalByToken,
  getDonationSummaryByNetwork,
  requiresCrossChainDonations,
  sortPaymentsByChain,
  formatAddressForDisplay,
  isValidAddress,
  validatePayments,
  getUniqueTokens,
  needsTokenApproval,
  countTokensNeedingApproval,
  type DonationPayment,
} from "../helpers";
import type { SupportedToken } from "@/constants/supportedTokens";

describe("Donation Helpers", () => {
  const mockToken: SupportedToken = {
    symbol: "USDC",
    chainId: 1,
    chainName: "Ethereum",
    decimals: 6,
    isNative: false,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    logoUrl: "",
    name: "USD Coin",
  };

  const mockNativeToken: SupportedToken = {
    symbol: "ETH",
    chainId: 1,
    chainName: "Ethereum",
    decimals: 18,
    isNative: true,
    address: "0x0000000000000000000000000000000000000000",
    logoUrl: "",
    name: "Ethereum",
  };

  describe("getTokenBalanceKey", () => {
    it("should generate correct key from token", () => {
      const key = getTokenBalanceKey(mockToken);
      expect(key).toBe("USDC-1");
    });

    it("should handle different chain IDs", () => {
      const polygonToken = { ...mockToken, chainId: 137, chainName: "Polygon" };
      const key = getTokenBalanceKey(polygonToken);
      expect(key).toBe("USDC-137");
    });

    it("should handle native tokens", () => {
      const key = getTokenBalanceKey(mockNativeToken);
      expect(key).toBe("ETH-1");
    });
  });

  describe("getTokenKey", () => {
    it("should generate correct key from symbol and chainId", () => {
      const key = getTokenKey("USDC", 1);
      expect(key).toBe("USDC-1");
    });

    it("should handle different symbols", () => {
      const key = getTokenKey("DAI", 137);
      expect(key).toBe("DAI-137");
    });
  });

  describe("formatDonationAmount", () => {
    it("should format valid amount with correct decimals", () => {
      const result = formatDonationAmount("100", 6);
      expect(result).toBe(BigInt(100000000));
    });

    it("should handle decimal amounts", () => {
      const result = formatDonationAmount("1.5", 18);
      expect(result).toBe(BigInt("1500000000000000000"));
    });

    it("should handle zero amount", () => {
      const result = formatDonationAmount("0", 6);
      expect(result).toBe(BigInt(0));
    });

    it("should handle empty string", () => {
      const result = formatDonationAmount("", 6);
      expect(result).toBe(BigInt(0));
    });

    it("should handle very small amounts", () => {
      const result = formatDonationAmount("0.000001", 6);
      expect(result).toBe(BigInt(1));
    });

    it("should handle invalid amounts gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const result = formatDonationAmount("invalid", 6);
      expect(result).toBe(BigInt(0));
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should handle large amounts", () => {
      const result = formatDonationAmount("1000000", 6);
      expect(result).toBe(BigInt(1000000000000));
    });
  });

  describe("parseDonationAmount", () => {
    it("should parse bigint to readable string", () => {
      const result = parseDonationAmount(BigInt(100000000), 6);
      expect(result).toBe("100.0000");
    });

    it("should parse with custom display decimals", () => {
      const result = parseDonationAmount(BigInt(100000000), 6, 2);
      expect(result).toBe("100.00");
    });

    it("should handle zero amount", () => {
      const result = parseDonationAmount(BigInt(0), 6);
      expect(result).toBe("0.0000");
    });

    it("should handle very small amounts", () => {
      const result = parseDonationAmount(BigInt(1), 6);
      expect(result).toBe("0.0000");
    });

    it("should handle 18 decimal tokens", () => {
      const result = parseDonationAmount(BigInt("1500000000000000000"), 18);
      expect(result).toBe("1.5000");
    });

    it("should handle errors gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const result = parseDonationAmount(BigInt(-1), 6);
      expect(typeof result).toBe("string");
      consoleErrorSpy.mockRestore();
    });
  });

  describe("validateDonationAmount", () => {
    it("should validate correct amount", () => {
      const result = validateDonationAmount("100");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject zero amount", () => {
      const result = validateDonationAmount("0");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Amount must be greater than 0");
    });

    it("should reject negative amount", () => {
      const result = validateDonationAmount("-1");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Amount must be greater than 0");
    });

    it("should reject invalid amount", () => {
      const result = validateDonationAmount("invalid");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Amount must be greater than 0");
    });

    it("should reject amount below minimum", () => {
      const result = validateDonationAmount("0.0000001");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Minimum donation");
    });

    it("should reject amount above maximum", () => {
      const result = validateDonationAmount("10000000000");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Maximum donation");
    });

    it("should accept amount at minimum", () => {
      const result = validateDonationAmount("0.000001");
      expect(result.valid).toBe(true);
    });

    it("should accept amount at maximum", () => {
      const result = validateDonationAmount("1000000000");
      expect(result.valid).toBe(true);
    });
  });

  describe("hasSufficientBalance", () => {
    it("should return true when balance is sufficient", () => {
      expect(hasSufficientBalance("10", "100")).toBe(true);
    });

    it("should return true when balance equals amount", () => {
      expect(hasSufficientBalance("100", "100")).toBe(true);
    });

    it("should return false when balance is insufficient", () => {
      expect(hasSufficientBalance("100", "10")).toBe(false);
    });

    it("should return false for invalid amount", () => {
      expect(hasSufficientBalance("invalid", "100")).toBe(false);
    });

    it("should return false for invalid balance", () => {
      expect(hasSufficientBalance("10", "invalid")).toBe(false);
    });

    it("should handle decimal amounts", () => {
      expect(hasSufficientBalance("1.5", "2.0")).toBe(true);
    });

    it("should handle errors gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      expect(hasSufficientBalance("10", "")).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe("groupPaymentsByChain", () => {
    const mockPayments: DonationPayment[] = [
      { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
      { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
      {
        projectId: "3",
        amount: "30",
        token: { ...mockToken, chainId: 137 },
        chainId: 137,
      },
    ];

    it("should group payments by chain ID", () => {
      const grouped = groupPaymentsByChain(mockPayments);
      expect(grouped.size).toBe(2);
      expect(grouped.get(1)).toHaveLength(2);
      expect(grouped.get(137)).toHaveLength(1);
    });

    it("should handle single chain", () => {
      const singleChain = mockPayments.slice(0, 2);
      const grouped = groupPaymentsByChain(singleChain);
      expect(grouped.size).toBe(1);
      expect(grouped.get(1)).toHaveLength(2);
    });

    it("should handle empty array", () => {
      const grouped = groupPaymentsByChain([]);
      expect(grouped.size).toBe(0);
    });
  });

  describe("countUniqueNetworks", () => {
    it("should count unique networks", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
        {
          projectId: "3",
          amount: "30",
          token: { ...mockToken, chainId: 137 },
          chainId: 137,
        },
      ];
      expect(countUniqueNetworks(payments)).toBe(2);
    });

    it("should return 0 for empty array", () => {
      expect(countUniqueNetworks([])).toBe(0);
    });

    it("should return 1 for single network", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
      ];
      expect(countUniqueNetworks(payments)).toBe(1);
    });
  });

  describe("getUniqueChainIds", () => {
    it("should return unique chain IDs", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockToken, chainId: 137 },
        { projectId: "3", amount: "30", token: mockToken, chainId: 1 },
      ];
      const chainIds = getUniqueChainIds(payments);
      expect(chainIds).toEqual([1, 137]);
    });

    it("should handle empty array", () => {
      expect(getUniqueChainIds([])).toEqual([]);
    });

    it("should handle single chain", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
      ];
      expect(getUniqueChainIds(payments)).toEqual([1]);
    });
  });

  describe("countNetworkSwitches", () => {
    it("should return 0 for empty array", () => {
      expect(countNetworkSwitches([], null)).toBe(0);
    });

    it("should return 0 when all on current network", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
      ];
      expect(countNetworkSwitches(payments, 1)).toBe(0);
    });

    it("should count switches when current network not in list", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockToken, chainId: 137 },
      ];
      expect(countNetworkSwitches(payments, 42)).toBe(2);
    });

    it("should count switches when current network is in list", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockToken, chainId: 137 },
      ];
      expect(countNetworkSwitches(payments, 1)).toBe(1);
    });

    it("should handle null current chain", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
      ];
      expect(countNetworkSwitches(payments, null)).toBe(1);
    });
  });

  describe("calculateTotalByToken", () => {
    it("should calculate total for specific token", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
        { projectId: "3", amount: "30", token: mockNativeToken, chainId: 1 },
      ];
      const total = calculateTotalByToken(payments, "USDC-1");
      expect(total).toBe("30.0000");
    });

    it("should return 0 for non-existent token", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
      ];
      const total = calculateTotalByToken(payments, "DAI-1");
      expect(total).toBe("0.0000");
    });

    it("should handle empty array", () => {
      const total = calculateTotalByToken([], "USDC-1");
      expect(total).toBe("0.0000");
    });
  });

  describe("getDonationSummaryByNetwork", () => {
    it("should generate summary by network", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
        {
          projectId: "3",
          amount: "30",
          token: { ...mockToken, chainId: 137, chainName: "Polygon" },
          chainId: 137,
        },
      ];
      const summary = getDonationSummaryByNetwork(payments, 1);

      expect(summary).toHaveLength(2);
      expect(summary[0].chainId).toBe(1);
      expect(summary[0].totalAmount).toBe("30.0000");
      expect(summary[0].needsSwitch).toBe(false);
      expect(summary[1].chainId).toBe(137);
      expect(summary[1].needsSwitch).toBe(true);
    });

    it("should handle empty array", () => {
      const summary = getDonationSummaryByNetwork([], 1);
      expect(summary).toEqual([]);
    });

    it("should sort by chain ID", () => {
      const payments: DonationPayment[] = [
        {
          projectId: "1",
          amount: "10",
          token: { ...mockToken, chainId: 137 },
          chainId: 137,
        },
        { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
      ];
      const summary = getDonationSummaryByNetwork(payments, 1);

      expect(summary[0].chainId).toBe(1);
      expect(summary[1].chainId).toBe(137);
    });
  });

  describe("requiresCrossChainDonations", () => {
    it("should return true for multiple chains", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        {
          projectId: "2",
          amount: "20",
          token: { ...mockToken, chainId: 137 },
          chainId: 137,
        },
      ];
      expect(requiresCrossChainDonations(payments)).toBe(true);
    });

    it("should return false for single chain", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
      ];
      expect(requiresCrossChainDonations(payments)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(requiresCrossChainDonations([])).toBe(false);
    });
  });

  describe("sortPaymentsByChain", () => {
    it("should sort payments by chain ID", () => {
      const payments: DonationPayment[] = [
        {
          projectId: "1",
          amount: "10",
          token: { ...mockToken, chainId: 137 },
          chainId: 137,
        },
        { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
        {
          projectId: "3",
          amount: "30",
          token: { ...mockToken, chainId: 42 },
          chainId: 42,
        },
      ];
      const sorted = sortPaymentsByChain(payments);

      expect(sorted[0].chainId).toBe(1);
      expect(sorted[1].chainId).toBe(42);
      expect(sorted[2].chainId).toBe(137);
    });

    it("should not mutate original array", () => {
      const payments: DonationPayment[] = [
        {
          projectId: "1",
          amount: "10",
          token: { ...mockToken, chainId: 137 },
          chainId: 137,
        },
        { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
      ];
      const sorted = sortPaymentsByChain(payments);

      expect(sorted).not.toBe(payments);
      expect(payments[0].chainId).toBe(137);
    });

    it("should handle empty array", () => {
      expect(sortPaymentsByChain([])).toEqual([]);
    });
  });

  describe("formatAddressForDisplay", () => {
    const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

    it("should format address with default chars", () => {
      const formatted = formatAddressForDisplay(address);
      expect(formatted).toBe("0xA0b8...eB48");
    });

    it("should format address with custom chars", () => {
      const formatted = formatAddressForDisplay(address, 8, 6);
      expect(formatted).toBe("0xA0b869...06eB48");
    });

    it("should return full address if too short", () => {
      const shortAddress = "0x1234";
      const formatted = formatAddressForDisplay(shortAddress);
      expect(formatted).toBe(shortAddress);
    });

    it("should handle empty string", () => {
      expect(formatAddressForDisplay("")).toBe("");
    });

    it("should handle undefined", () => {
      expect(formatAddressForDisplay(undefined as any)).toBe("");
    });
  });

  describe("isValidAddress", () => {
    it("should validate correct Ethereum address", () => {
      expect(isValidAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")).toBe(
        true
      );
    });

    it("should reject address without 0x prefix", () => {
      expect(isValidAddress("A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")).toBe(
        false
      );
    });

    it("should reject address with wrong length", () => {
      expect(isValidAddress("0x1234")).toBe(false);
    });

    it("should reject address with invalid characters", () => {
      expect(isValidAddress("0xG0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")).toBe(
        false
      );
    });

    it("should reject empty string", () => {
      expect(isValidAddress("")).toBe(false);
    });

    it("should reject undefined", () => {
      expect(isValidAddress(undefined)).toBe(false);
    });

    it("should accept lowercase address", () => {
      expect(isValidAddress("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")).toBe(
        true
      );
    });
  });

  describe("validatePayments", () => {
    it("should validate correct payments", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
      ];
      const result = validatePayments(payments);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject empty array", () => {
      const result = validatePayments([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No donations to process");
    });

    it("should reject payment without project ID", () => {
      const payments: DonationPayment[] = [
        { projectId: "", amount: "10", token: mockToken, chainId: 1 },
      ];
      const result = validatePayments(payments);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing project ID");
    });

    it("should reject payment without token", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: null as any, chainId: 1 },
      ];
      const result = validatePayments(payments);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing token");
    });

    it("should reject payment with invalid amount", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "0", token: mockToken, chainId: 1 },
      ];
      const result = validatePayments(payments);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid amount");
    });

    it("should reject payment without chain ID", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 0 },
      ];
      const result = validatePayments(payments);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing chain ID");
    });

    it("should accumulate multiple errors", () => {
      const payments: DonationPayment[] = [
        { projectId: "", amount: "0", token: null as any, chainId: 0 },
      ];
      const result = validatePayments(payments);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("getUniqueTokens", () => {
    it("should return unique tokens", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockToken, chainId: 1 },
        { projectId: "3", amount: "30", token: mockNativeToken, chainId: 1 },
      ];
      const tokens = getUniqueTokens(payments);

      expect(tokens).toHaveLength(2);
      expect(tokens.some((t) => t.symbol === "USDC")).toBe(true);
      expect(tokens.some((t) => t.symbol === "ETH")).toBe(true);
    });

    it("should handle empty array", () => {
      expect(getUniqueTokens([])).toEqual([]);
    });

    it("should handle single token", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
      ];
      expect(getUniqueTokens(payments)).toHaveLength(1);
    });
  });

  describe("needsTokenApproval", () => {
    it("should return true for ERC20 tokens", () => {
      expect(needsTokenApproval(mockToken)).toBe(true);
    });

    it("should return false for native tokens", () => {
      expect(needsTokenApproval(mockNativeToken)).toBe(false);
    });
  });

  describe("countTokensNeedingApproval", () => {
    it("should count ERC20 tokens", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockToken, chainId: 1 },
        { projectId: "2", amount: "20", token: mockNativeToken, chainId: 1 },
        {
          projectId: "3",
          amount: "30",
          token: { ...mockToken, symbol: "DAI" },
          chainId: 1,
        },
      ];
      expect(countTokensNeedingApproval(payments)).toBe(2);
    });

    it("should return 0 for only native tokens", () => {
      const payments: DonationPayment[] = [
        { projectId: "1", amount: "10", token: mockNativeToken, chainId: 1 },
      ];
      expect(countTokensNeedingApproval(payments)).toBe(0);
    });

    it("should return 0 for empty array", () => {
      expect(countTokensNeedingApproval([])).toBe(0);
    });
  });
});
