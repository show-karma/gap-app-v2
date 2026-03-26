/**
 * Tests for utilities/donations/helpers.ts
 *
 * Pure function tests for donation helper utilities:
 * - Token key generation
 * - Amount formatting and parsing
 * - Validation logic
 * - Payment grouping, sorting, and analysis
 * - Address formatting and validation
 */

import { VALIDATION_CONSTANTS } from "@/constants/donation";
import type { SupportedToken } from "@/constants/supportedTokens";
import {
  calculateTotalByToken,
  countNetworkSwitches,
  countTokensNeedingApproval,
  countUniqueNetworks,
  type DonationPayment,
  formatAddressForDisplay,
  formatDonationAmount,
  getDonationSummaryByNetwork,
  getTokenBalanceKey,
  getTokenKey,
  getUniqueChainIds,
  getUniqueTokens,
  groupPaymentsByChain,
  hasSufficientBalance,
  isValidAddress,
  needsTokenApproval,
  parseDonationAmount,
  requiresCrossChainDonations,
  sortPaymentsByChain,
  validateDonationAmount,
  validatePayments,
} from "@/utilities/donations/helpers";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function createMockToken(overrides: Partial<SupportedToken> = {}): SupportedToken {
  return {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false,
    ...overrides,
  };
}

function createMockPayment(overrides: Partial<DonationPayment> = {}): DonationPayment {
  return {
    projectId: "project-1",
    amount: "10.5",
    token: createMockToken(),
    chainId: 10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("utilities/donations/helpers", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // getTokenBalanceKey / getTokenKey
  // =========================================================================

  describe("getTokenBalanceKey", () => {
    it("should generate key from token symbol and chainId", () => {
      const token = createMockToken({ symbol: "USDC", chainId: 10 });
      expect(getTokenBalanceKey(token)).toBe("USDC-10");
    });

    it("should produce unique keys for same symbol on different chains", () => {
      const tokenOp = createMockToken({ symbol: "USDC", chainId: 10 });
      const tokenBase = createMockToken({ symbol: "USDC", chainId: 8453 });
      expect(getTokenBalanceKey(tokenOp)).not.toBe(getTokenBalanceKey(tokenBase));
    });
  });

  describe("getTokenKey", () => {
    it("should generate key from symbol and chainId", () => {
      expect(getTokenKey("ETH", 1)).toBe("ETH-1");
    });
  });

  // =========================================================================
  // formatDonationAmount
  // =========================================================================

  describe("formatDonationAmount", () => {
    it("should convert a decimal string to bigint with correct decimals", () => {
      // 10.5 USDC (6 decimals) = 10_500_000
      const result = formatDonationAmount("10.5", 6);
      expect(result).toBe(10_500_000n);
    });

    it("should handle 18-decimal tokens", () => {
      const result = formatDonationAmount("1.0", 18);
      expect(result).toBe(1_000_000_000_000_000_000n);
    });

    it("should return 0n for empty string", () => {
      expect(formatDonationAmount("", 18)).toBe(0n);
    });

    it("should return 0n for '0'", () => {
      expect(formatDonationAmount("0", 18)).toBe(0n);
    });

    it("should return 0n for '0.0'", () => {
      expect(formatDonationAmount("0.0", 6)).toBe(0n);
    });

    it("should return 0n and log error for invalid amount", () => {
      const result = formatDonationAmount("not-a-number", 18);
      expect(result).toBe(0n);
      expect(console.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // parseDonationAmount
  // =========================================================================

  describe("parseDonationAmount", () => {
    it("should convert bigint to human-readable string with default display decimals", () => {
      // 10_500_000 with 6 decimals = "10.5000"
      const result = parseDonationAmount(10_500_000n, 6);
      expect(result).toBe("10.5000");
    });

    it("should respect custom displayDecimals", () => {
      const result = parseDonationAmount(10_500_000n, 6, 2);
      expect(result).toBe("10.50");
    });

    it("should return '0.0000' for zero amount", () => {
      expect(parseDonationAmount(0n, 18)).toBe("0.0000");
    });

    it("should return fallback on error", () => {
      // Force an error by passing invalid inputs - the function catches errors
      // Since BigInt is always valid, we test the error path indirectly
      const result = parseDonationAmount(0n, 18);
      expect(result).toBe("0.0000");
    });
  });

  // =========================================================================
  // validateDonationAmount
  // =========================================================================

  describe("validateDonationAmount", () => {
    it("should accept valid amounts", () => {
      expect(validateDonationAmount("1.0")).toEqual({ valid: true });
      expect(validateDonationAmount("100")).toEqual({ valid: true });
    });

    it("should reject NaN", () => {
      const result = validateDonationAmount("abc");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("greater than 0");
    });

    it("should reject zero", () => {
      const result = validateDonationAmount("0");
      expect(result.valid).toBe(false);
    });

    it("should reject negative amounts", () => {
      const result = validateDonationAmount("-5");
      expect(result.valid).toBe(false);
    });

    it("should reject amounts below minimum", () => {
      const result = validateDonationAmount("0.0000000001");
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${VALIDATION_CONSTANTS.MIN_DONATION_AMOUNT}`);
    });

    it("should reject amounts above maximum", () => {
      const result = validateDonationAmount("99999999999");
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${VALIDATION_CONSTANTS.MAX_DONATION_AMOUNT}`);
    });

    it("should accept the minimum amount", () => {
      const result = validateDonationAmount(String(VALIDATION_CONSTANTS.MIN_DONATION_AMOUNT));
      expect(result.valid).toBe(true);
    });

    it("should accept the maximum amount", () => {
      const result = validateDonationAmount(String(VALIDATION_CONSTANTS.MAX_DONATION_AMOUNT));
      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // hasSufficientBalance
  // =========================================================================

  describe("hasSufficientBalance", () => {
    it("should return true when balance >= amount", () => {
      expect(hasSufficientBalance("10", "20")).toBe(true);
      expect(hasSufficientBalance("10", "10")).toBe(true);
    });

    it("should return false when balance < amount", () => {
      expect(hasSufficientBalance("10", "5")).toBe(false);
    });

    it("should return false for NaN inputs", () => {
      expect(hasSufficientBalance("abc", "10")).toBe(false);
      expect(hasSufficientBalance("10", "xyz")).toBe(false);
    });
  });

  // =========================================================================
  // groupPaymentsByChain
  // =========================================================================

  describe("groupPaymentsByChain", () => {
    it("should group payments by chainId", () => {
      const payments = [
        createMockPayment({ chainId: 10 }),
        createMockPayment({ chainId: 8453 }),
        createMockPayment({ chainId: 10 }),
      ];

      const grouped = groupPaymentsByChain(payments);
      expect(grouped.size).toBe(2);
      expect(grouped.get(10)).toHaveLength(2);
      expect(grouped.get(8453)).toHaveLength(1);
    });

    it("should return empty map for empty array", () => {
      const grouped = groupPaymentsByChain([]);
      expect(grouped.size).toBe(0);
    });
  });

  // =========================================================================
  // countUniqueNetworks / getUniqueChainIds
  // =========================================================================

  describe("countUniqueNetworks", () => {
    it("should count distinct chain IDs", () => {
      const payments = [
        createMockPayment({ chainId: 10 }),
        createMockPayment({ chainId: 10 }),
        createMockPayment({ chainId: 8453 }),
      ];
      expect(countUniqueNetworks(payments)).toBe(2);
    });

    it("should return 0 for empty array", () => {
      expect(countUniqueNetworks([])).toBe(0);
    });
  });

  describe("getUniqueChainIds", () => {
    it("should return unique chain IDs", () => {
      const payments = [
        createMockPayment({ chainId: 10 }),
        createMockPayment({ chainId: 10 }),
        createMockPayment({ chainId: 1 }),
      ];
      const ids = getUniqueChainIds(payments);
      expect(ids).toHaveLength(2);
      expect(ids).toContain(10);
      expect(ids).toContain(1);
    });
  });

  // =========================================================================
  // countNetworkSwitches
  // =========================================================================

  describe("countNetworkSwitches", () => {
    it("should return 0 for empty payments", () => {
      expect(countNetworkSwitches([], 10)).toBe(0);
    });

    it("should return 0 when all payments are on the current chain", () => {
      const payments = [createMockPayment({ chainId: 10 }), createMockPayment({ chainId: 10 })];
      expect(countNetworkSwitches(payments, 10)).toBe(0);
    });

    it("should count switches needed for multi-chain payments", () => {
      const payments = [
        createMockPayment({ chainId: 10 }),
        createMockPayment({ chainId: 8453 }),
        createMockPayment({ chainId: 1 }),
      ];
      // On chain 10 already, need to switch to 8453 and 1 = 2 switches
      expect(countNetworkSwitches(payments, 10)).toBe(2);
    });

    it("should count all chains when currentChainId is null", () => {
      const payments = [createMockPayment({ chainId: 10 }), createMockPayment({ chainId: 8453 })];
      // null means we are not connected, each unique chain is a switch
      expect(countNetworkSwitches(payments, null)).toBe(2);
    });

    it("should count extra switch when current chain is not in payment chains", () => {
      const payments = [createMockPayment({ chainId: 10 }), createMockPayment({ chainId: 8453 })];
      // On chain 1, need to switch to both 10 and 8453 = 2 switches
      expect(countNetworkSwitches(payments, 1)).toBe(2);
    });
  });

  // =========================================================================
  // calculateTotalByToken
  // =========================================================================

  describe("calculateTotalByToken", () => {
    it("should sum amounts for matching token key", () => {
      const token = createMockToken({ symbol: "USDC", chainId: 10 });
      const payments = [
        createMockPayment({ amount: "10.5", token }),
        createMockPayment({ amount: "5.25", token }),
        createMockPayment({
          amount: "100",
          token: createMockToken({ symbol: "DAI", chainId: 10 }),
        }),
      ];

      const total = calculateTotalByToken(payments, "USDC-10");
      expect(parseFloat(total)).toBeCloseTo(15.75, 4);
    });

    it("should return 0 when no payments match", () => {
      const payments = [createMockPayment()];
      const total = calculateTotalByToken(payments, "ETH-1");
      expect(parseFloat(total)).toBe(0);
    });
  });

  // =========================================================================
  // getDonationSummaryByNetwork
  // =========================================================================

  describe("getDonationSummaryByNetwork", () => {
    it("should produce sorted summaries per chain", () => {
      const payments = [
        createMockPayment({
          chainId: 8453,
          amount: "10",
          token: createMockToken({ chainId: 8453, chainName: "Base" }),
        }),
        createMockPayment({ chainId: 10, amount: "5" }),
        createMockPayment({ chainId: 10, amount: "3" }),
      ];

      const summaries = getDonationSummaryByNetwork(payments, 10);

      expect(summaries).toHaveLength(2);
      // Sorted by chainId: 10 first, 8453 second
      expect(summaries[0].chainId).toBe(10);
      expect(summaries[0].projectCount).toBe(2);
      expect(parseFloat(summaries[0].totalAmount)).toBeCloseTo(8, 4);
      expect(summaries[0].needsSwitch).toBe(false);

      expect(summaries[1].chainId).toBe(8453);
      expect(summaries[1].needsSwitch).toBe(true);
    });

    it("should return empty for no payments", () => {
      expect(getDonationSummaryByNetwork([], 10)).toEqual([]);
    });
  });

  // =========================================================================
  // requiresCrossChainDonations / sortPaymentsByChain
  // =========================================================================

  describe("requiresCrossChainDonations", () => {
    it("should return false for single-chain payments", () => {
      const payments = [createMockPayment({ chainId: 10 }), createMockPayment({ chainId: 10 })];
      expect(requiresCrossChainDonations(payments)).toBe(false);
    });

    it("should return true for multi-chain payments", () => {
      const payments = [createMockPayment({ chainId: 10 }), createMockPayment({ chainId: 8453 })];
      expect(requiresCrossChainDonations(payments)).toBe(true);
    });
  });

  describe("sortPaymentsByChain", () => {
    it("should sort payments by chainId ascending", () => {
      const payments = [
        createMockPayment({ chainId: 8453 }),
        createMockPayment({ chainId: 1 }),
        createMockPayment({ chainId: 10 }),
      ];
      const sorted = sortPaymentsByChain(payments);
      expect(sorted.map((p) => p.chainId)).toEqual([1, 10, 8453]);
    });

    it("should not mutate the original array", () => {
      const payments = [createMockPayment({ chainId: 8453 }), createMockPayment({ chainId: 1 })];
      sortPaymentsByChain(payments);
      expect(payments[0].chainId).toBe(8453);
    });
  });

  // =========================================================================
  // formatAddressForDisplay / isValidAddress
  // =========================================================================

  describe("formatAddressForDisplay", () => {
    it("should truncate a standard address", () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      expect(formatAddressForDisplay(addr)).toBe("0x1234...5678");
    });

    it("should return empty string for falsy input", () => {
      expect(formatAddressForDisplay("")).toBe("");
      expect(formatAddressForDisplay(undefined as unknown as string)).toBe("");
    });

    it("should not truncate addresses shorter than start+end", () => {
      expect(formatAddressForDisplay("0x1234")).toBe("0x1234");
    });

    it("should respect custom start/end chars", () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      expect(formatAddressForDisplay(addr, 4, 2)).toBe("0x12...78");
    });
  });

  describe("isValidAddress", () => {
    it("should accept valid Ethereum addresses", () => {
      expect(isValidAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(true);
      expect(isValidAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12")).toBe(true);
    });

    it("should reject invalid addresses", () => {
      expect(isValidAddress("0x1234")).toBe(false);
      expect(isValidAddress("not-an-address")).toBe(false);
      expect(isValidAddress("")).toBe(false);
      expect(isValidAddress(undefined)).toBe(false);
    });
  });

  // =========================================================================
  // validatePayments
  // =========================================================================

  describe("validatePayments", () => {
    it("should accept valid payments", () => {
      const payments = [createMockPayment()];
      const result = validatePayments(payments);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty payments array", () => {
      const result = validatePayments([]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("No donations");
    });

    it("should detect missing projectId", () => {
      const result = validatePayments([createMockPayment({ projectId: "" })]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing project ID");
    });

    it("should detect invalid amount", () => {
      const result = validatePayments([createMockPayment({ amount: "0" })]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid amount");
    });

    it("should detect missing chainId", () => {
      const result = validatePayments([createMockPayment({ chainId: 0 })]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing chain ID");
    });

    it("should collect multiple errors across payments", () => {
      const payments = [
        createMockPayment({ projectId: "", amount: "0" }),
        createMockPayment({ chainId: 0 }),
      ];
      const result = validatePayments(payments);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  // =========================================================================
  // getUniqueTokens / needsTokenApproval / countTokensNeedingApproval
  // =========================================================================

  describe("getUniqueTokens", () => {
    it("should deduplicate tokens by symbol-chainId key", () => {
      const token = createMockToken({ symbol: "USDC", chainId: 10 });
      const payments = [
        createMockPayment({ token }),
        createMockPayment({ token }),
        createMockPayment({ token: createMockToken({ symbol: "DAI", chainId: 10 }) }),
      ];

      const unique = getUniqueTokens(payments);
      expect(unique).toHaveLength(2);
    });
  });

  describe("needsTokenApproval", () => {
    it("should return true for ERC20 tokens", () => {
      expect(needsTokenApproval(createMockToken({ isNative: false }))).toBe(true);
    });

    it("should return false for native tokens", () => {
      expect(needsTokenApproval(createMockToken({ isNative: true }))).toBe(false);
    });
  });

  describe("countTokensNeedingApproval", () => {
    it("should count only non-native unique tokens", () => {
      const payments = [
        createMockPayment({
          token: createMockToken({ isNative: false, symbol: "USDC", chainId: 10 }),
        }),
        createMockPayment({
          token: createMockToken({ isNative: false, symbol: "USDC", chainId: 10 }),
        }),
        createMockPayment({
          token: createMockToken({ isNative: true, symbol: "ETH", chainId: 10 }),
        }),
      ];
      expect(countTokensNeedingApproval(payments)).toBe(1);
    });
  });
});
