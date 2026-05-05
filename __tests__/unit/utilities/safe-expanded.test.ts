/**
 * Expanded tests for utilities/safe.ts
 *
 * Focuses on functions that benefit from additional coverage beyond safe.test.ts:
 * - estimateGasFee: edge cases (no valid recipients, USD price fetch failure)
 * - getTransactionStatus: service URL missing, API errors
 * - getSafeTokenBalance: native vs ERC20 paths, error handling
 *
 * Note: These tests complement the existing safe.test.ts (~940 lines) by covering
 * additional branches and edge scenarios.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------

const { mockSafeInstance, mockApiKitInstance, mockRPCClient } = vi.hoisted(() => {
  const mockSafeInstance = {
    getOwners: vi.fn().mockResolvedValue(["0xOwner1"]),
    getThreshold: vi.fn().mockResolvedValue(1),
    getNonce: vi.fn().mockResolvedValue(0),
    getTransactionHash: vi.fn().mockResolvedValue("0xtxhash"),
    signHash: vi.fn().mockResolvedValue({ data: "0xsig" }),
    createTransaction: vi.fn().mockResolvedValue({
      data: {
        to: "0xrecipient",
        value: "0",
        data: "0x",
        operation: 0,
        safeTxGas: "100000",
        baseGas: "21000",
        gasPrice: "0",
        gasToken: "0x0000000000000000000000000000000000000000",
        refundReceiver: "0x0000000000000000000000000000000000000000",
        nonce: 0,
      },
    }),
  };

  const mockApiKitInstance = {
    getSafeInfo: vi.fn().mockResolvedValue({ address: "0xSafe" }),
    getTransaction: vi.fn().mockResolvedValue({
      isExecuted: false,
      isSuccessful: null,
      transactionHash: null,
      executionDate: null,
      confirmationsRequired: 2,
      confirmations: [{ owner: "0xOwner1" }],
    }),
  };

  const mockRPCClient = {
    getBytecode: vi.fn().mockResolvedValue("0x6080604052"),
    getBalance: vi.fn().mockResolvedValue(2_000_000_000_000_000_000n),
    readContract: vi.fn(),
    getGasPrice: vi.fn().mockResolvedValue(50_000_000n),
  };

  return { mockSafeInstance, mockApiKitInstance, mockRPCClient };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@safe-global/protocol-kit", () => ({
  default: {
    init: vi.fn().mockImplementation(async () => mockSafeInstance),
  },
}));

vi.mock("@safe-global/api-kit", () => {
  return {
    default: vi.fn(function (this: any) {
      Object.assign(this, mockApiKitInstance);
    }),
  };
});

vi.mock("@/utilities/rpcClient", () => ({
  getRPCClient: vi.fn().mockResolvedValue(mockRPCClient),
  getRPCUrlByChainId: vi.fn().mockReturnValue("https://rpc.test.com"),
}));

// Mock global fetch for CoinGecko price calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

const itSdk = it;

import type { SupportedChainId } from "@/config/tokens";
import type { DisbursementRecipient } from "@/types/disbursement";
import { estimateGasFee, getSafeTokenBalance, getTransactionStatus } from "@/utilities/safe";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("utilities/safe.ts - expanded coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // getTransactionStatus
  // =========================================================================

  describe("getTransactionStatus", () => {
    itSdk("should return transaction status for a supported chain", async () => {
      const status = await getTransactionStatus("0xsafetxhash", 10 as SupportedChainId);

      expect(status).toMatchObject({
        isExecuted: false,
        isSuccessful: null,
        transactionHash: null,
        executionDate: null,
        confirmationsRequired: 2,
        confirmationsSubmitted: 1,
      });
    });

    it("should throw for unsupported chain (no Safe Transaction Service URL)", async () => {
      // Chain 1329 (Sei) has no Safe Transaction Service URL
      await expect(getTransactionStatus("0xhash", 1329 as SupportedChainId)).rejects.toThrow(
        "Safe Transaction Service not available"
      );
    });

    itSdk("should throw when API Kit getTransaction fails", async () => {
      mockApiKitInstance.getTransaction.mockRejectedValueOnce(new Error("Not Found"));

      await expect(getTransactionStatus("0xhash", 10 as SupportedChainId)).rejects.toThrow(
        "Failed to fetch transaction status"
      );
    });

    itSdk("should handle confirmations being undefined", async () => {
      mockApiKitInstance.getTransaction.mockResolvedValueOnce({
        isExecuted: true,
        isSuccessful: true,
        transactionHash: "0xonchain",
        executionDate: "2025-01-01",
        confirmationsRequired: 2,
        confirmations: undefined,
      });

      const status = await getTransactionStatus("0xhash", 10 as SupportedChainId);
      expect(status.confirmationsSubmitted).toBe(0);
    });
  });

  // =========================================================================
  // getSafeTokenBalance
  // =========================================================================

  describe("getSafeTokenBalance", () => {
    it("should fetch native token balance when tokenAddress is null", async () => {
      const result = await getSafeTokenBalance("0xSafeAddress", null, 10 as SupportedChainId);

      expect(result.balance).toBe("2000000000000000000");
      expect(parseFloat(result.balanceFormatted)).toBeCloseTo(2.0);
      expect(result.decimals).toBe(18);
      expect(mockRPCClient.getBalance).toHaveBeenCalled();
    });

    it("should fetch ERC20 balance when tokenAddress is provided", async () => {
      // readContract returns balance first, then decimals
      mockRPCClient.readContract
        .mockResolvedValueOnce(1_000_000n) // balanceOf
        .mockResolvedValueOnce(6); // decimals

      const result = await getSafeTokenBalance(
        "0xSafeAddress",
        "0xTokenAddress",
        10 as SupportedChainId
      );

      expect(result.balance).toBe("1000000");
      expect(parseFloat(result.balanceFormatted)).toBeCloseTo(1.0);
      expect(result.decimals).toBe(6);
      expect(mockRPCClient.readContract).toHaveBeenCalledTimes(2);
    });

    it("should throw when RPC client call fails", async () => {
      mockRPCClient.getBalance.mockRejectedValueOnce(new Error("RPC down"));

      await expect(getSafeTokenBalance("0xSafe", null, 10 as SupportedChainId)).rejects.toThrow(
        "Failed to fetch Safe balance"
      );
    });
  });

  // =========================================================================
  // estimateGasFee
  // =========================================================================

  describe("estimateGasFee", () => {
    const defaultRecipients: DisbursementRecipient[] = [
      { address: "0x1111111111111111111111111111111111111111", amount: "1.0", error: undefined },
      { address: "0x2222222222222222222222222222222222222222", amount: "2.0", error: undefined },
    ];

    it("should estimate gas for native token transfers", async () => {
      // CoinGecko returns a price
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ethereum: { usd: 3000 } }),
      });

      const result = await estimateGasFee(
        "0xSafeAddress",
        defaultRecipients,
        null, // native token
        10 as SupportedChainId,
        18
      );

      expect(result.gasEstimate).toBeGreaterThan(0n);
      expect(result.gasPrice).toBe(50_000_000n);
      expect(result.totalFeeWei).toBe(result.gasEstimate * result.gasPrice);
      expect(result.nativeTokenSymbol).toBeTruthy();
      expect(result.totalFeeFormatted).toBeTruthy();
    });

    it("should handle USD price fetch failure gracefully (totalFeeUSD is null)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const result = await estimateGasFee(
        "0xSafeAddress",
        defaultRecipients,
        null,
        10 as SupportedChainId,
        18
      );

      expect(result.totalFeeUSD).toBeNull();
      // Gas estimation should still work
      expect(result.gasEstimate).toBeGreaterThan(0n);
    });

    it("should handle CoinGecko network error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await estimateGasFee(
        "0xSafeAddress",
        defaultRecipients,
        null,
        10 as SupportedChainId,
        18
      );

      expect(result.totalFeeUSD).toBeNull();
    });

    it("should throw for zero valid recipients", async () => {
      const allErrorRecipients: DisbursementRecipient[] = [
        { address: "0x1111111111111111111111111111111111111111", amount: "1.0", error: "invalid" },
      ];

      await expect(
        estimateGasFee("0xSafe", allErrorRecipients, null, 10 as SupportedChainId, 18)
      ).rejects.toThrow("No valid recipients");
    });

    it("should use safeTxGas when Safe SDK provides it", async () => {
      // The mock already returns safeTxGas: "100000" and baseGas: "21000"
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ethereum: { usd: 2000 } }),
      });

      const result = await estimateGasFee(
        "0xSafe",
        defaultRecipients,
        null,
        10 as SupportedChainId,
        18
      );

      // safeTxGas(100000) + baseGas(21000) + overhead(50000) = 171000
      expect(result.gasEstimate).toBe(171_000n);
    });

    it("should fall back to per-recipient estimation when safeTxGas is 0", async () => {
      mockSafeInstance.createTransaction.mockResolvedValueOnce({
        data: {
          to: "0xrecipient",
          value: "0",
          data: "0x",
          operation: 0,
          safeTxGas: "0",
          baseGas: "0",
          gasPrice: "0",
          gasToken: "0x0000000000000000000000000000000000000000",
          refundReceiver: "0x0000000000000000000000000000000000000000",
          nonce: 0,
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ethereum: { usd: 2000 } }),
      });

      const result = await estimateGasFee(
        "0xSafe",
        defaultRecipients,
        null,
        10 as SupportedChainId,
        18
      );

      // overhead(50000) + 2 * (65000 + 5000) = 190000
      expect(result.gasEstimate).toBe(190_000n);
    });

    it("should estimate gas for ERC20 token transfers", async () => {
      // readContract for decimals
      mockRPCClient.readContract.mockResolvedValueOnce(6);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ethereum: { usd: 3000 } }),
      });

      const result = await estimateGasFee(
        "0xSafe",
        defaultRecipients,
        "0xTokenAddress",
        10 as SupportedChainId,
        6
      );

      expect(result.gasEstimate).toBeGreaterThan(0n);
    });

    it("should fall back to provided decimals when readContract fails for ERC20", async () => {
      mockRPCClient.readContract.mockRejectedValueOnce(new Error("not a contract"));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ethereum: { usd: 3000 } }),
      });

      // Should not throw, uses fallback decimals
      const result = await estimateGasFee(
        "0xSafe",
        defaultRecipients,
        "0xTokenAddress",
        10 as SupportedChainId,
        8
      );

      expect(result.gasEstimate).toBeGreaterThan(0n);
    });
  });
});
