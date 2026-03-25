/**
 * Safe wallet trust tests.
 *
 * Tests Safe-related utilities from utilities/safe.ts:
 * - isSafeDeployed: bytecode detection
 * - isSafeOwner: owner list matching
 * - isSafeDelegate: Safe Transaction Service API check
 * - canProposeToSafe: combined owner/delegate check
 * - getSafeTokenBalance: native + ERC20 balances
 * - isSafeIndexed: Safe Transaction Service indexing check
 * - getSafeInfo: owners/threshold/nonce
 * - prepareDisbursementTransaction: native + ERC20 tx building
 * - signAndProposeDisbursement: validation, signing, proposal
 * - getTransactionStatus: transaction status from Service
 * - createEthereumProvider: provider method routing
 * - getSafeServiceUrl: URL generation per chain
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all heavy dependencies before importing the module under test
vi.mock("@safe-global/api-kit", () => {
  function MockSafeApiKit() {
    return {
      getSafeInfo: vi.fn().mockResolvedValue({}),
      getTransaction: vi.fn().mockResolvedValue({
        isExecuted: false,
        isSuccessful: null,
        transactionHash: null,
        executionDate: null,
        confirmationsRequired: 2,
        confirmations: [],
      }),
    };
  }
  return { default: MockSafeApiKit };
});

vi.mock("@safe-global/protocol-kit", () => {
  const mockSafe = {
    getOwners: vi.fn().mockResolvedValue(["0xOwner1", "0xOwner2"]),
    getThreshold: vi.fn().mockResolvedValue(2),
    getNonce: vi.fn().mockResolvedValue(5),
    getTransactionHash: vi.fn().mockResolvedValue("0xtxhash"),
    signHash: vi.fn().mockResolvedValue({ data: "0xsignature" }),
    createTransaction: vi.fn().mockResolvedValue({
      data: {
        to: "0xrecipient",
        value: "1000000",
        data: "0x",
        operation: 0,
        safeTxGas: "0",
        baseGas: "0",
        gasPrice: "0",
        gasToken: "0x0000000000000000000000000000000000000000",
        refundReceiver: "0x0000000000000000000000000000000000000000",
        nonce: 5,
      },
    }),
  };
  return {
    default: {
      init: vi.fn().mockResolvedValue(mockSafe),
    },
  };
});

vi.mock("@/utilities/rpcClient", () => ({
  getRPCClient: vi.fn().mockResolvedValue({
    getBytecode: vi.fn().mockResolvedValue("0x6080"),
    getBalance: vi.fn().mockResolvedValue(1000000000000000000n),
    readContract: vi.fn().mockResolvedValue(500000n),
    getGasPrice: vi.fn().mockResolvedValue(1000000000n),
  }),
  getRPCUrlByChainId: vi.fn().mockReturnValue("https://rpc.example.com"),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import SafeApiKit from "@safe-global/api-kit";
import Safe from "@safe-global/protocol-kit";
import type { SupportedChainId } from "@/config/tokens";
import type { DisbursementRecipient } from "@/types/disbursement";
import { getRPCClient } from "@/utilities/rpcClient";
import {
  canProposeToSafe,
  getSafeInfo,
  getSafeTokenBalance,
  getTransactionStatus,
  isSafeDelegate,
  isSafeDeployed,
  isSafeIndexed,
  isSafeOwner,
  prepareDisbursementTransaction,
  signAndProposeDisbursement,
} from "@/utilities/safe";

describe("Safe trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // isSafeDeployed
  // -------------------------------------------------------------------------
  describe("isSafeDeployed", () => {
    it("returns true when bytecode exists", async () => {
      const result = await isSafeDeployed("0xSafe", 10 as SupportedChainId);
      expect(result).toBe(true);
    });

    it("returns false when bytecode is undefined", async () => {
      const client = await getRPCClient(10);
      vi.mocked(client.getBytecode).mockResolvedValueOnce(undefined);
      const result = await isSafeDeployed("0xSafe", 10 as SupportedChainId);
      expect(result).toBe(false);
    });

    it("returns false when bytecode is 0x", async () => {
      const client = await getRPCClient(10);
      vi.mocked(client.getBytecode).mockResolvedValueOnce("0x");
      const result = await isSafeDeployed("0xSafe", 10 as SupportedChainId);
      expect(result).toBe(false);
    });

    it("returns false on RPC error", async () => {
      const client = await getRPCClient(10);
      vi.mocked(client.getBytecode).mockRejectedValueOnce(new Error("RPC down"));
      const result = await isSafeDeployed("0xSafe", 10 as SupportedChainId);
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // isSafeOwner
  // -------------------------------------------------------------------------
  describe("isSafeOwner", () => {
    it("returns true when signer is in owners list", async () => {
      const result = await isSafeOwner("0xSafe", "0xOwner1", 10 as SupportedChainId);
      expect(result).toBe(true);
    });

    it("case-insensitive comparison", async () => {
      const result = await isSafeOwner("0xSafe", "0xowner1", 10 as SupportedChainId);
      expect(result).toBe(true);
    });

    it("returns false when signer is not an owner", async () => {
      const result = await isSafeOwner("0xSafe", "0xStranger", 10 as SupportedChainId);
      expect(result).toBe(false);
    });

    it("returns false on Safe SDK error", async () => {
      vi.mocked(Safe.init).mockRejectedValueOnce(new Error("Init failed"));
      const result = await isSafeOwner("0xSafe", "0xOwner1", 10 as SupportedChainId);
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // isSafeDelegate
  // -------------------------------------------------------------------------
  describe("isSafeDelegate", () => {
    it("returns true when delegate count > 0", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 1 }),
      });
      const result = await isSafeDelegate("0xSafe", "0xDelegate", 10 as SupportedChainId);
      expect(result).toBe(true);
    });

    it("returns false when delegate count is 0", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0 }),
      });
      const result = await isSafeDelegate("0xSafe", "0xDelegate", 10 as SupportedChainId);
      expect(result).toBe(false);
    });

    it("returns false on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const result = await isSafeDelegate("0xSafe", "0xDelegate", 10 as SupportedChainId);
      expect(result).toBe(false);
    });

    it("returns false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const result = await isSafeDelegate("0xSafe", "0xDelegate", 10 as SupportedChainId);
      expect(result).toBe(false);
    });

    it("returns false for unsupported chain (no txServiceUrl)", async () => {
      // Chain 1329 (Sei) has no Safe Transaction Service
      const result = await isSafeDelegate("0xSafe", "0xDelegate", 1329 as SupportedChainId);
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // canProposeToSafe
  // -------------------------------------------------------------------------
  describe("canProposeToSafe", () => {
    it("returns canPropose true when signer is owner", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0 }),
      });
      const result = await canProposeToSafe("0xSafe", "0xOwner1", 10 as SupportedChainId);
      expect(result.canPropose).toBe(true);
      expect(result.isOwner).toBe(true);
    });

    it("returns canPropose true when signer is delegate only", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 1 }),
      });
      const result = await canProposeToSafe("0xSafe", "0xStranger", 10 as SupportedChainId);
      expect(result.canPropose).toBe(true);
      expect(result.isOwner).toBe(false);
      expect(result.isDelegate).toBe(true);
    });

    it("returns canPropose false when neither owner nor delegate", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0 }),
      });
      const result = await canProposeToSafe("0xSafe", "0xStranger", 10 as SupportedChainId);
      expect(result.canPropose).toBe(false);
    });

    it("handles individual check failures gracefully", async () => {
      // Owner check succeeds, delegate check fails
      mockFetch.mockRejectedValueOnce(new Error("API down"));
      const result = await canProposeToSafe("0xSafe", "0xOwner1", 10 as SupportedChainId);
      // Owner check should still work via Safe SDK
      expect(result.isOwner).toBe(true);
      expect(result.canPropose).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getSafeTokenBalance
  // -------------------------------------------------------------------------
  describe("getSafeTokenBalance", () => {
    it("returns native token balance when tokenAddress is null", async () => {
      const result = await getSafeTokenBalance("0xSafe", null, 10 as SupportedChainId);
      expect(result.balance).toBe("1000000000000000000");
      expect(result.decimals).toBe(18);
      expect(parseFloat(result.balanceFormatted)).toBeCloseTo(1.0);
    });

    it("returns ERC20 balance with decimals", async () => {
      const client = await getRPCClient(10);
      // First call: balanceOf, second call: decimals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- readContract has complex generic return type
      vi.mocked(client.readContract)
        .mockResolvedValueOnce(500000n as unknown as never)
        .mockResolvedValueOnce(6 as unknown as never);

      const result = await getSafeTokenBalance("0xSafe", "0xToken", 10 as SupportedChainId);
      expect(result.balance).toBe("500000");
      expect(result.decimals).toBe(6);
    });

    it("throws on RPC failure", async () => {
      const client = await getRPCClient(10);
      vi.mocked(client.getBalance).mockRejectedValueOnce(new Error("RPC error"));
      await expect(getSafeTokenBalance("0xSafe", null, 10 as SupportedChainId)).rejects.toThrow(
        "Failed to fetch Safe balance"
      );
    });
  });

  // -------------------------------------------------------------------------
  // isSafeIndexed
  // -------------------------------------------------------------------------
  describe("isSafeIndexed", () => {
    it("returns true when getSafeInfo succeeds", async () => {
      const result = await isSafeIndexed("0xSafe", 10 as SupportedChainId);
      expect(result).toBe(true);
    });

    it("returns false for unsupported chain", async () => {
      const result = await isSafeIndexed("0xSafe", 1329 as SupportedChainId);
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getSafeInfo
  // -------------------------------------------------------------------------
  describe("getSafeInfo", () => {
    it("returns owners, threshold, and nonce", async () => {
      const info = await getSafeInfo("0xSafe", 10 as SupportedChainId);
      expect(info.owners).toEqual(["0xOwner1", "0xOwner2"]);
      expect(info.threshold).toBe(2);
      expect(info.nonce).toBe(5);
    });

    it("throws on SDK init failure", async () => {
      vi.mocked(Safe.init).mockRejectedValueOnce(new Error("Init failed"));
      await expect(getSafeInfo("0xSafe", 10 as SupportedChainId)).rejects.toThrow(
        "Failed to fetch Safe information"
      );
    });
  });

  // -------------------------------------------------------------------------
  // prepareDisbursementTransaction
  // -------------------------------------------------------------------------
  describe("prepareDisbursementTransaction", () => {
    const recipients: DisbursementRecipient[] = [
      { address: "0xRecipient1", amount: "1.0", error: undefined },
      { address: "0xRecipient2", amount: "2.0", error: undefined },
    ];

    it("creates transaction for valid recipients", async () => {
      const result = await prepareDisbursementTransaction(
        "0xSafe",
        recipients,
        null,
        10 as SupportedChainId
      );
      expect(result.totalRecipients).toBe(2);
      expect(result.totalAmount).toBe(3.0);
      expect(result.safeTx).toBeDefined();
    });

    it("filters recipients with errors", async () => {
      const mixedRecipients: DisbursementRecipient[] = [
        ...recipients,
        { address: "0xBad", amount: "1.0", error: "Invalid address" },
      ];
      const result = await prepareDisbursementTransaction(
        "0xSafe",
        mixedRecipients,
        null,
        10 as SupportedChainId
      );
      expect(result.totalRecipients).toBe(2); // Only valid ones
    });

    it("throws on Safe SDK failure", async () => {
      vi.mocked(Safe.init).mockRejectedValueOnce(new Error("Init failed"));
      await expect(
        prepareDisbursementTransaction("0xSafe", recipients, null, 10 as SupportedChainId)
      ).rejects.toThrow("Failed to prepare transaction");
    });
  });

  // -------------------------------------------------------------------------
  // signAndProposeDisbursement — validation
  // -------------------------------------------------------------------------
  describe("signAndProposeDisbursement", () => {
    const recipients: DisbursementRecipient[] = [{ address: "0xRecipient1", amount: "1.0" }];

    it("throws when wallet client has no account", async () => {
      await expect(
        signAndProposeDisbursement("0xSafe", recipients, null, 10 as SupportedChainId, {} as any)
      ).rejects.toThrow("Wallet client is not properly connected");
    });

    it("throws when safeAddress is empty", async () => {
      const walletClient = {
        account: { address: "0xSigner" },
        signTypedData: vi.fn(),
      };
      await expect(
        signAndProposeDisbursement(
          "",
          recipients,
          null,
          10 as SupportedChainId,
          walletClient as any
        )
      ).rejects.toThrow("Missing required parameters");
    });

    it("throws when recipients array is empty", async () => {
      const walletClient = {
        account: { address: "0xSigner" },
        signTypedData: vi.fn(),
      };
      await expect(
        signAndProposeDisbursement("0xSafe", [], null, 10 as SupportedChainId, walletClient as any)
      ).rejects.toThrow("Missing required parameters");
    });

    it("throws for chain without Safe Transaction Service", async () => {
      const walletClient = {
        account: { address: "0xSigner" },
        signTypedData: vi.fn(),
      };
      await expect(
        signAndProposeDisbursement(
          "0xSafe",
          recipients,
          null,
          1135 as SupportedChainId, // Lisk - no Safe Transaction Service
          walletClient as any
        )
      ).rejects.toThrow("Safe Transaction Service is not available");
    });

    it("signs and proposes successfully", async () => {
      // Mock the delegate check fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ count: 0 }),
        })
        // Mock the proposal POST
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const walletClient = {
        account: { address: "0xOwner1" },
        signTypedData: vi.fn().mockResolvedValue("0xsig"),
      };

      const result = await signAndProposeDisbursement(
        "0xSafe",
        recipients,
        null,
        10 as SupportedChainId,
        walletClient as any
      );

      expect(result.txHash).toBe("0xtxhash");
      expect(result.executed).toBe(false);
      expect(result.safeUrl).toContain("app.safe.global");
    });

    it("throws on signHash rejection", async () => {
      // Mock the delegate check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0 }),
      });

      // Make signHash fail
      const mockSafe = await Safe.init({ provider: "", safeAddress: "" });
      vi.mocked(mockSafe.signHash).mockRejectedValueOnce(new Error("User rejected signing"));

      const walletClient = {
        account: { address: "0xOwner1" },
        signTypedData: vi.fn(),
      };

      await expect(
        signAndProposeDisbursement(
          "0xSafe",
          recipients,
          null,
          10 as SupportedChainId,
          walletClient as any
        )
      ).rejects.toThrow("Failed to sign transaction");
    });

    it("handles 404 from proposal endpoint", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ count: 0 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not Found"),
        });

      const walletClient = {
        account: { address: "0xOwner1" },
        signTypedData: vi.fn(),
      };

      await expect(
        signAndProposeDisbursement(
          "0xSafe",
          recipients,
          null,
          10 as SupportedChainId,
          walletClient as any
        )
      ).rejects.toThrow(/Safe not found/);
    });

    it("handles 400 validation error from proposal endpoint", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ count: 0 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve(JSON.stringify({ nonFieldErrors: ["Invalid nonce"] })),
        });

      const walletClient = {
        account: { address: "0xOwner1" },
        signTypedData: vi.fn(),
      };

      await expect(
        signAndProposeDisbursement(
          "0xSafe",
          recipients,
          null,
          10 as SupportedChainId,
          walletClient as any
        )
      ).rejects.toThrow(/Transaction validation failed.*Invalid nonce/);
    });
  });

  // -------------------------------------------------------------------------
  // getTransactionStatus
  // -------------------------------------------------------------------------
  describe("getTransactionStatus", () => {
    it("returns transaction status from API", async () => {
      const status = await getTransactionStatus("0xtxhash", 10 as SupportedChainId);
      expect(status.isExecuted).toBe(false);
      expect(status.confirmationsRequired).toBe(2);
      expect(status.confirmationsSubmitted).toBe(0);
    });

    it("throws for unsupported chain", async () => {
      await expect(getTransactionStatus("0xtxhash", 1329 as SupportedChainId)).rejects.toThrow(
        "Safe Transaction Service not available"
      );
    });
  });
});
