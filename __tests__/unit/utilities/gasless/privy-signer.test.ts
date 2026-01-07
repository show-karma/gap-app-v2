/**
 * Tests for Privy signer creation utility.
 * Verifies EIP-7702 signAuthorization and message signing functionality.
 */

import {
  createPrivySignerForGasless,
  type PrivyEmbeddedWallet,
} from "@/utilities/gasless/utils/privy-signer";

describe("Privy Signer", () => {
  let mockProvider: {
    request: jest.Mock;
  };
  let mockEmbeddedWallet: PrivyEmbeddedWallet;

  beforeEach(() => {
    mockProvider = {
      request: jest.fn(),
    };

    mockEmbeddedWallet = {
      address: "0x1234567890123456789012345678901234567890",
      switchChain: jest.fn().mockResolvedValue(undefined),
      getEthereumProvider: jest.fn().mockResolvedValue(mockProvider),
      walletClientType: "privy",
    };
  });

  describe("createPrivySignerForGasless", () => {
    it("should create a local account with correct address", async () => {
      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);

      expect(signer.address).toBe("0x1234567890123456789012345678901234567890");
      expect(signer.type).toBe("local");
      expect(signer.source).toBe("custom");
    });

    it("should have signAuthorization method for Privy embedded wallets", async () => {
      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);

      expect(typeof signer.signAuthorization).toBe("function");
    });

    it("should have signMessage method", async () => {
      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);

      expect(typeof signer.signMessage).toBe("function");
    });

    it("should have signTypedData method", async () => {
      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);

      expect(typeof signer.signTypedData).toBe("function");
    });
  });

  describe("sign (raw hash)", () => {
    it("should call secp256k1_sign for Privy embedded wallets", async () => {
      const mockSignature =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.sign!({ hash: "0xabcd1234" as `0x${string}` });

      expect(mockProvider.request).toHaveBeenCalledWith({
        method: "secp256k1_sign",
        params: ["0xabcd1234"],
      });
      expect(result).toBe(mockSignature);
    });

    it("should throw error for non-Privy wallets", async () => {
      const nonPrivyWallet = {
        ...mockEmbeddedWallet,
        walletClientType: "metamask",
      };

      const signer = await createPrivySignerForGasless(nonPrivyWallet, 10);

      await expect(signer.sign!({ hash: "0xabcd1234" as `0x${string}` })).rejects.toThrow(
        "Raw signing is only supported for Privy embedded wallets"
      );
    });
  });

  describe("signMessage", () => {
    it("should sign string messages using personal_sign", async () => {
      const mockSignature = "0xsignature";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.signMessage({ message: "Hello World" });

      expect(mockProvider.request).toHaveBeenCalledWith({
        method: "personal_sign",
        params: ["Hello World", "0x1234567890123456789012345678901234567890"],
      });
      expect(result).toBe(mockSignature);
    });

    it("should sign raw hex messages", async () => {
      const mockSignature = "0xsignature";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.signMessage({
        message: { raw: "0xdeadbeef" as `0x${string}` },
      });

      expect(mockProvider.request).toHaveBeenCalledWith({
        method: "personal_sign",
        params: ["0xdeadbeef", "0x1234567890123456789012345678901234567890"],
      });
      expect(result).toBe(mockSignature);
    });

    it("should sign raw Uint8Array messages", async () => {
      const mockSignature = "0xsignature";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.signMessage({
        message: { raw: new Uint8Array([0xde, 0xad, 0xbe, 0xef]) },
      });

      expect(mockProvider.request).toHaveBeenCalledWith({
        method: "personal_sign",
        params: ["0xdeadbeef", "0x1234567890123456789012345678901234567890"],
      });
      expect(result).toBe(mockSignature);
    });
  });

  describe("signTypedData", () => {
    it("should sign typed data using eth_signTypedData_v4", async () => {
      const mockSignature = "0xsignature";
      mockProvider.request.mockResolvedValue(mockSignature);

      const typedData = {
        domain: { name: "Test", version: "1", chainId: 10 },
        types: { Message: [{ name: "content", type: "string" }] },
        primaryType: "Message",
        message: { content: "Hello" },
      };

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.signTypedData(typedData);

      expect(mockProvider.request).toHaveBeenCalledWith({
        method: "eth_signTypedData_v4",
        params: ["0x1234567890123456789012345678901234567890", JSON.stringify(typedData)],
      });
      expect(result).toBe(mockSignature);
    });

    it("should handle BigInt values in typed data", async () => {
      const mockSignature = "0xsignature";
      mockProvider.request.mockResolvedValue(mockSignature);

      const typedData = {
        domain: { name: "Test", version: "1", chainId: 10 },
        types: { Transfer: [{ name: "amount", type: "uint256" }] },
        primaryType: "Transfer",
        message: { amount: BigInt("1000000000000000000") },
      };

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      await signer.signTypedData(typedData);

      const calledParams = mockProvider.request.mock.calls[0][0].params[1];
      expect(calledParams).toContain("1000000000000000000");
      expect(calledParams).not.toContain("BigInt");
    });
  });

  describe("signTransaction", () => {
    it("should throw error for signTransaction", async () => {
      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);

      await expect(signer.signTransaction!()).rejects.toThrow(
        "signTransaction not supported - use user operations"
      );
    });
  });

  describe("signAuthorization (EIP-7702)", () => {
    it("should sign authorization with contractAddress", async () => {
      const mockSignature =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.signAuthorization!({
        contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
        chainId: 10,
        nonce: 0,
      });

      expect(mockProvider.request).toHaveBeenCalledWith({
        method: "secp256k1_sign",
        params: [expect.stringMatching(/^0x/)],
      });

      expect(result).toEqual({
        contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        address: "0xabcdef1234567890abcdef1234567890abcdef12",
        chainId: 10,
        nonce: 0,
        r: expect.stringMatching(/^0x/),
        s: expect.stringMatching(/^0x/),
        v: expect.any(BigInt),
        yParity: expect.any(Number),
      });
    });

    it("should sign authorization with address field", async () => {
      const mockSignature =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.signAuthorization!({
        address: "0xfedcba0987654321fedcba0987654321fedcba09" as `0x${string}`,
        chainId: 10,
        nonce: 1,
      });

      expect(result.contractAddress).toBe("0xfedcba0987654321fedcba0987654321fedcba09");
      expect(result.address).toBe("0xfedcba0987654321fedcba0987654321fedcba09");
    });

    it("should throw error if no target address provided", async () => {
      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);

      await expect(
        signer.signAuthorization!({
          chainId: 10,
          nonce: 0,
        })
      ).rejects.toThrow("No target address provided for EIP-7702 authorization");
    });

    it("should throw error for non-Privy wallets", async () => {
      const nonPrivyWallet = {
        ...mockEmbeddedWallet,
        walletClientType: "metamask",
      };

      const signer = await createPrivySignerForGasless(nonPrivyWallet, 10);

      await expect(
        signer.signAuthorization!({
          contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
          chainId: 10,
        })
      ).rejects.toThrow("EIP-7702 signAuthorization is only supported for Privy embedded wallets");
    });

    it("should use default chainId from createPrivySignerForGasless", async () => {
      const mockSignature =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 42220);
      const result = await signer.signAuthorization!({
        contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
        // chainId not specified, should use 42220
        nonce: 0,
      });

      expect(result.chainId).toBe(42220);
    });

    it("should use default nonce of 0", async () => {
      const mockSignature =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.signAuthorization!({
        contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
        chainId: 10,
        // nonce not specified, should default to 0
      });

      expect(result.nonce).toBe(0);
    });

    it("should correctly parse signature components for v=27", async () => {
      // Signature with v=27 (0x1b)
      const mockSignature =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.signAuthorization!({
        contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
        chainId: 10,
        nonce: 0,
      });

      expect(result.yParity).toBe(0);
      expect(result.v).toBe(27n);
    });

    it("should correctly parse signature components for v=28", async () => {
      // Signature with v=28 (0x1c)
      const mockSignature =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c";
      mockProvider.request.mockResolvedValue(mockSignature);

      const signer = await createPrivySignerForGasless(mockEmbeddedWallet, 10);
      const result = await signer.signAuthorization!({
        contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
        chainId: 10,
        nonce: 0,
      });

      expect(result.yParity).toBe(1);
      expect(result.v).toBe(28n);
    });
  });
});
