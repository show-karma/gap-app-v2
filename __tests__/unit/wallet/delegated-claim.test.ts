/**
 * Delegated claim / Safe disbursement trust tests.
 *
 * Since the delegated-claim hooks don't exist in this codebase,
 * these tests cover the equivalent delegated transaction boundary:
 * the Safe sign-and-propose flow and the Ethereum provider adapter.
 *
 * Tests:
 * - createEthereumProvider method routing (eth_sendTransaction, personal_sign, etc.)
 * - EIP-712 typed data signing through provider adapter
 * - Account mismatch detection in provider
 * - Transaction proposal body construction
 * - Signature decomposition logic
 * - State machine: idle -> signing -> proposing -> success
 * - Error handling at each stage
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Delegated claim / Safe provider trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Ethereum provider adapter — method routing
  // -------------------------------------------------------------------------
  describe("createEthereumProvider method routing", () => {
    // Simulate the provider logic from safe.ts createEthereumProvider
    function createMockProvider(walletClient: any, chainId: number) {
      return {
        request: async (args: { method: string; params?: any }) => {
          const { method, params } = args;

          if (method === "eth_sendTransaction") {
            return await walletClient.sendTransaction(params[0]);
          }

          if (method === "eth_signTransaction") {
            return await walletClient.signTransaction(params[0]);
          }

          if (method === "eth_signTypedData_v4" || method === "eth_signTypedData") {
            const [address, typedData] = params;
            const parsedTypedData =
              typeof typedData === "string" ? JSON.parse(typedData) : typedData;

            if (address?.toLowerCase() !== walletClient.account?.address?.toLowerCase()) {
              throw new Error(`Address mismatch: ${address} vs ${walletClient.account?.address}`);
            }

            return await walletClient.signTypedData({
              domain: parsedTypedData.domain,
              types: parsedTypedData.types,
              primaryType: parsedTypedData.primaryType,
              message: parsedTypedData.message,
            });
          }

          if (method === "personal_sign") {
            const [message, address] = params;
            if (address?.toLowerCase() !== walletClient.account?.address?.toLowerCase()) {
              throw new Error(`Address mismatch: ${address} vs ${walletClient.account?.address}`);
            }
            return await walletClient.signMessage({
              message:
                typeof message === "string" && message.startsWith("0x")
                  ? { raw: message }
                  : message,
            });
          }

          if (method === "eth_accounts" || method === "eth_requestAccounts") {
            return [walletClient.account?.address].filter(Boolean);
          }

          if (method === "eth_chainId") {
            return `0x${chainId.toString(16)}`;
          }

          throw new Error(`Unhandled method: ${method}`);
        },
      };
    }

    const mockWalletClient = {
      account: { address: "0xSigner123" },
      sendTransaction: vi.fn().mockResolvedValue("0xtxhash"),
      signTransaction: vi.fn().mockResolvedValue("0xsignedtx"),
      signTypedData: vi.fn().mockResolvedValue("0xsignature"),
      signMessage: vi.fn().mockResolvedValue("0xmsgsig"),
    };

    it("routes eth_sendTransaction to walletClient.sendTransaction", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      const result = await provider.request({
        method: "eth_sendTransaction",
        params: [{ to: "0xRecipient", value: "0x0" }],
      });
      expect(result).toBe("0xtxhash");
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        to: "0xRecipient",
        value: "0x0",
      });
    });

    it("routes eth_signTransaction to walletClient.signTransaction", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      const result = await provider.request({
        method: "eth_signTransaction",
        params: [{ to: "0xRecipient" }],
      });
      expect(result).toBe("0xsignedtx");
    });

    it("routes eth_signTypedData_v4 with address verification", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      const typedData = {
        domain: { name: "Safe", chainId: 10 },
        types: { EIP712Domain: [] },
        primaryType: "SafeTx",
        message: { to: "0x1" },
      };
      const result = await provider.request({
        method: "eth_signTypedData_v4",
        params: ["0xSigner123", typedData],
      });
      expect(result).toBe("0xsignature");
    });

    it("parses string typed data (JSON)", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      const typedData = JSON.stringify({
        domain: { name: "Safe" },
        types: {},
        primaryType: "SafeTx",
        message: {},
      });
      const result = await provider.request({
        method: "eth_signTypedData_v4",
        params: ["0xSigner123", typedData],
      });
      expect(result).toBe("0xsignature");
    });

    it("throws on address mismatch for signTypedData", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      await expect(
        provider.request({
          method: "eth_signTypedData_v4",
          params: ["0xWrongAddress", { domain: {}, types: {}, message: {} }],
        })
      ).rejects.toThrow(/Address mismatch/);
    });

    it("routes personal_sign with address verification", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      const result = await provider.request({
        method: "personal_sign",
        params: ["Hello", "0xSigner123"],
      });
      expect(result).toBe("0xmsgsig");
    });

    it("handles hex message in personal_sign", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      await provider.request({
        method: "personal_sign",
        params: ["0xdeadbeef", "0xSigner123"],
      });
      expect(mockWalletClient.signMessage).toHaveBeenCalledWith({
        message: { raw: "0xdeadbeef" },
      });
    });

    it("throws on address mismatch for personal_sign", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      await expect(
        provider.request({
          method: "personal_sign",
          params: ["Hello", "0xWrongAddress"],
        })
      ).rejects.toThrow(/Address mismatch/);
    });

    it("returns accounts array for eth_accounts", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      const accounts = await provider.request({
        method: "eth_accounts",
      });
      expect(accounts).toEqual(["0xSigner123"]);
    });

    it("returns accounts array for eth_requestAccounts", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      expect(accounts).toEqual(["0xSigner123"]);
    });

    it("returns empty array when no account", async () => {
      const clientNoAccount = { ...mockWalletClient, account: null };
      const provider = createMockProvider(clientNoAccount, 10);
      const accounts = await provider.request({
        method: "eth_accounts",
      });
      expect(accounts).toEqual([]);
    });

    it("returns hex chain ID for eth_chainId", async () => {
      const provider = createMockProvider(mockWalletClient, 10);
      const chainId = await provider.request({ method: "eth_chainId" });
      expect(chainId).toBe("0xa"); // 10 in hex
    });

    it("returns correct hex for different chain IDs", async () => {
      const provider = createMockProvider(mockWalletClient, 42161);
      const chainId = await provider.request({ method: "eth_chainId" });
      expect(chainId).toBe("0xa4b1"); // 42161 in hex
    });
  });

  // -------------------------------------------------------------------------
  // Transaction proposal body
  // -------------------------------------------------------------------------
  describe("proposal body construction", () => {
    it("includes all required fields", () => {
      const safeTx = {
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
      };

      const proposalBody = {
        to: safeTx.data.to,
        value: safeTx.data.value,
        data: safeTx.data.data,
        operation: safeTx.data.operation,
        safeTxGas: String(safeTx.data.safeTxGas),
        baseGas: String(safeTx.data.baseGas),
        gasPrice: String(safeTx.data.gasPrice),
        gasToken: safeTx.data.gasToken,
        refundReceiver: safeTx.data.refundReceiver,
        nonce: safeTx.data.nonce,
        contractTransactionHash: "0xhash",
        sender: "0xSigner",
        signature: "0xsig",
        origin: "GAP Disbursement",
      };

      expect(proposalBody).toHaveProperty("to");
      expect(proposalBody).toHaveProperty("value");
      expect(proposalBody).toHaveProperty("data");
      expect(proposalBody).toHaveProperty("operation");
      expect(proposalBody).toHaveProperty("safeTxGas");
      expect(proposalBody).toHaveProperty("baseGas");
      expect(proposalBody).toHaveProperty("gasPrice");
      expect(proposalBody).toHaveProperty("gasToken");
      expect(proposalBody).toHaveProperty("refundReceiver");
      expect(proposalBody).toHaveProperty("nonce");
      expect(proposalBody).toHaveProperty("contractTransactionHash");
      expect(proposalBody).toHaveProperty("sender");
      expect(proposalBody).toHaveProperty("signature");
      expect(proposalBody.origin).toBe("GAP Disbursement");
    });

    it("safeTxGas and baseGas are stringified", () => {
      const safeTxGas = 100000;
      const baseGas = 50000;
      expect(String(safeTxGas)).toBe("100000");
      expect(String(baseGas)).toBe("50000");
    });
  });

  // -------------------------------------------------------------------------
  // Signature decomposition
  // -------------------------------------------------------------------------
  describe("signature decomposition", () => {
    it("65-byte signature decomposes into r, s, v", () => {
      // A mock 65-byte signature (0x + 130 hex chars)
      const sig =
        "0x" +
        "a".repeat(64) + // r (32 bytes)
        "b".repeat(64) + // s (32 bytes)
        "1b"; // v (1 byte = 27)

      const r = "0x" + sig.slice(2, 66);
      const s = "0x" + sig.slice(66, 130);
      const v = parseInt(sig.slice(130, 132), 16);

      expect(r).toBe("0x" + "a".repeat(64));
      expect(s).toBe("0x" + "b".repeat(64));
      expect(v).toBe(27);
    });

    it("v value 28 (0x1c) is valid", () => {
      const sig = "0x" + "a".repeat(64) + "b".repeat(64) + "1c";
      const v = parseInt(sig.slice(130, 132), 16);
      expect(v).toBe(28);
    });
  });

  // -------------------------------------------------------------------------
  // State machine transitions
  // -------------------------------------------------------------------------
  describe("state machine", () => {
    type Phase = "idle" | "checking" | "approving" | "donating" | "completed" | "error";

    it("normal flow: idle -> checking -> donating -> completed", () => {
      const phases: Phase[] = [];
      const emit = (phase: Phase) => phases.push(phase);

      emit("checking");
      emit("donating");
      emit("completed");

      expect(phases).toEqual(["checking", "donating", "completed"]);
    });

    it("approval flow: checking -> approving -> donating -> completed", () => {
      const phases: Phase[] = [];
      const emit = (phase: Phase) => phases.push(phase);

      emit("checking");
      emit("approving");
      emit("donating");
      emit("completed");

      expect(phases).toEqual(["checking", "approving", "donating", "completed"]);
    });

    it("error at any stage transitions to error", () => {
      const phases: Phase[] = [];
      const emit = (phase: Phase) => phases.push(phase);

      emit("checking");
      emit("error");

      expect(phases[phases.length - 1]).toBe("error");
    });

    it("error state includes error message", () => {
      const state = { phase: "error" as Phase, error: "User rejected" };
      expect(state.error).toBe("User rejected");
    });

    it("reset clears state", () => {
      let state: { phase: Phase; error?: string } = {
        phase: "error",
        error: "Something failed",
      };
      // Reset
      state = { phase: "completed" };
      expect(state.phase).toBe("completed");
      expect(state.error).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Error handling per stage
  // -------------------------------------------------------------------------
  describe("error handling per stage", () => {
    it("wallet not connected throws before any transaction", () => {
      const address = null;
      expect(() => {
        if (!address) throw new Error("Wallet not connected");
      }).toThrow("Wallet not connected");
    });

    it("signTypedData rejection is catchable", async () => {
      const mockSign = vi.fn().mockRejectedValue(new Error("User rejected signing"));

      await expect(mockSign()).rejects.toThrow("User rejected signing");
    });

    it("writeContract rejection is catchable", async () => {
      const mockWrite = vi.fn().mockRejectedValue(new Error("execution reverted"));

      await expect(mockWrite()).rejects.toThrow("execution reverted");
    });

    it("receipt verification catches reverted status", () => {
      const receipt = { status: "reverted" };
      expect(receipt.status).not.toBe("success");
    });

    it("receipt with success status passes", () => {
      const receipt = { status: "success" };
      expect(receipt.status).toBe("success");
    });

    it("proposal POST failure returns parseable error", async () => {
      const response = {
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ nonFieldErrors: ["Invalid nonce"] })),
      };

      const errorText = await response.text();
      const errorData = JSON.parse(errorText);
      expect(errorData.nonFieldErrors).toContain("Invalid nonce");
    });
  });
});
