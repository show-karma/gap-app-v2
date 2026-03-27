/**
 * Safe wallet Tier A unit tests.
 *
 * Tests core Safe utility functions with mocked Safe SDK and RPC client:
 * - isSafeDeployed: bytecode presence detection
 * - isSafeOwner: owner list membership check
 * - canProposeToSafe: combined owner + delegate check
 * - prepareDisbursementTransaction: SafeTransactionData shape
 * - Unsupported chain handling
 * - RPC failure graceful handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------

const { mockSafeInstance, mockRPCClient } = vi.hoisted(() => {
  const mockSafeInstance = {
    getOwners: vi.fn().mockResolvedValue(["0xOwnerA", "0xOwnerB", "0xOwnerC"]),
    getThreshold: vi.fn().mockResolvedValue(2),
    getNonce: vi.fn().mockResolvedValue(7),
    createTransaction: vi.fn().mockResolvedValue({
      data: {
        to: "0xrecipient",
        value: "1000000000000000000",
        data: "0x",
        operation: 0,
        safeTxGas: "0",
        baseGas: "0",
        gasPrice: "0",
        gasToken: "0x0000000000000000000000000000000000000000",
        refundReceiver: "0x0000000000000000000000000000000000000000",
        nonce: 7,
      },
    }),
  };

  const mockRPCClient = {
    getBytecode: vi.fn().mockResolvedValue("0x6080604052"),
    getBalance: vi.fn().mockResolvedValue(5000000000000000000n),
    readContract: vi.fn().mockResolvedValue(1000000n),
    getGasPrice: vi.fn().mockResolvedValue(50000000n),
  };

  return { mockSafeInstance, mockRPCClient };
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
  const MockApiKit = () => ({
    getSafeInfo: vi.fn().mockResolvedValue({ address: "0xSafe" }),
  });
  return { default: MockApiKit };
});

vi.mock("@/utilities/rpcClient", () => ({
  getRPCClient: vi.fn().mockResolvedValue(mockRPCClient),
  getRPCUrlByChainId: vi.fn().mockReturnValue("https://rpc.test.example"),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import type { SupportedChainId } from "@/config/tokens";
import {
  canProposeToSafe,
  isSafeDeployed,
  isSafeOwner,
  prepareDisbursementTransaction,
} from "@/utilities/safe";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Safe wallet — Tier A unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // isSafeDeployed
  // =========================================================================

  describe("isSafeDeployed", () => {
    it("returns true when bytecode exists at address", async () => {
      mockRPCClient.getBytecode.mockResolvedValueOnce("0x608060405234801561001057600080fd");
      const result = await isSafeDeployed("0xSafeAddr", 10 as SupportedChainId);
      expect(result).toBe(true);
    });

    it("returns false when no bytecode at address (not deployed)", async () => {
      mockRPCClient.getBytecode.mockResolvedValueOnce(undefined);
      const result = await isSafeDeployed("0xSafeAddr", 10 as SupportedChainId);
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // isSafeOwner
  // =========================================================================

  describe("isSafeOwner", () => {
    it("returns true when signer is in owners array", async () => {
      const result = await isSafeOwner("0xSafe", "0xOwnerA", 10 as SupportedChainId);
      expect(result).toBe(true);
    });

    it("performs case-insensitive address comparison", async () => {
      const result = await isSafeOwner("0xSafe", "0xownera", 10 as SupportedChainId);
      expect(result).toBe(true);
    });

    it("returns false when signer is not in owners array", async () => {
      const result = await isSafeOwner("0xSafe", "0xStranger", 10 as SupportedChainId);
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // canProposeToSafe
  // =========================================================================

  describe("canProposeToSafe", () => {
    it("returns canPropose=true when signer is an owner", async () => {
      // Delegate check returns false
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0 }),
      });

      const result = await canProposeToSafe("0xSafe", "0xOwnerA", 10 as SupportedChainId);
      expect(result.canPropose).toBe(true);
      expect(result.isOwner).toBe(true);
      expect(result.isDelegate).toBe(false);
    });

    it("returns canPropose=true when signer is a delegate but not owner", async () => {
      // Delegate check returns true
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 1 }),
      });

      const result = await canProposeToSafe("0xSafe", "0xDelegate", 10 as SupportedChainId);
      expect(result.canPropose).toBe(true);
      expect(result.isOwner).toBe(false);
      expect(result.isDelegate).toBe(true);
    });

    it("returns canPropose=false when signer is neither owner nor delegate", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0 }),
      });

      const result = await canProposeToSafe("0xSafe", "0xStranger", 10 as SupportedChainId);
      expect(result.canPropose).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.isDelegate).toBe(false);
    });
  });

  // =========================================================================
  // prepareDisbursementTransaction
  // =========================================================================

  describe("prepareDisbursementTransaction", () => {
    it("builds correct transaction shape for native token transfers", async () => {
      const recipients = [
        { address: "0xRecipient1" as `0x${string}`, amount: "1.0", error: undefined },
        { address: "0xRecipient2" as `0x${string}`, amount: "2.5", error: undefined },
      ];

      const result = await prepareDisbursementTransaction(
        "0xSafe",
        recipients,
        null,
        10 as SupportedChainId,
        18
      );

      expect(result.totalRecipients).toBe(2);
      expect(result.totalAmount).toBe(3.5);
      expect(result.safeTx).toBeDefined();
      expect(mockSafeInstance.createTransaction).toHaveBeenCalledWith({
        transactions: expect.arrayContaining([expect.objectContaining({ data: "0x" })]),
      });
    });

    it("filters out recipients with errors", async () => {
      const recipients = [
        { address: "0xRecipient1" as `0x${string}`, amount: "1.0", error: undefined },
        { address: "0xBadRecipient" as `0x${string}`, amount: "0", error: "Invalid address" },
      ];

      await prepareDisbursementTransaction("0xSafe", recipients, null, 10 as SupportedChainId, 18);

      // Only valid recipients should be in the transaction
      const callArgs = mockSafeInstance.createTransaction.mock.calls[0][0];
      expect(callArgs.transactions).toHaveLength(1);
    });
  });

  // =========================================================================
  // Unsupported chain
  // =========================================================================

  describe("unsupported chain handling", () => {
    it("canProposeToSafe returns canPropose=false for unsupported chain (delegate check fails)", async () => {
      // Chain 999999 has no Safe Transaction Service URL
      // isSafeDelegate returns false for unsupported chains
      // isSafeOwner may still work via RPC
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await canProposeToSafe("0xSafe", "0xStranger", 999999 as SupportedChainId);
      // Not an owner (0xStranger not in mock owners list)
      expect(result.isOwner).toBe(false);
      // Delegate is false for unsupported chain (no service URL)
      expect(result.isDelegate).toBe(false);
      expect(result.canPropose).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // RPC failure handling
  // =========================================================================

  describe("RPC failure graceful handling", () => {
    it("isSafeDeployed returns false on RPC error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockRPCClient.getBytecode.mockRejectedValueOnce(new Error("RPC connection refused"));

      const result = await isSafeDeployed("0xSafe", 10 as SupportedChainId);
      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });

    it("isSafeOwner returns false on Safe SDK init failure", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const Safe = await import("@safe-global/protocol-kit");
      vi.mocked(Safe.default.init).mockRejectedValueOnce(new Error("Network unreachable"));

      const result = await isSafeOwner("0xSafe", "0xOwnerA", 10 as SupportedChainId);
      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
