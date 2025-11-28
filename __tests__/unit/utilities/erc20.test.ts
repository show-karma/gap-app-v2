import type { Address, PublicClient, WalletClient } from "viem";
import {
  approveToken,
  checkTokenAllowance,
  checkTokenAllowances,
  executeApprovals,
  getApprovalAmount,
  MAX_UINT256,
} from "@/utilities/erc20";

// Mock viem
jest.mock("viem", () => {
  const actual = jest.requireActual("viem");
  return {
    ...actual,
  };
});

describe("erc20 utilities", () => {
  const mockTokenAddress = "0x1234567890123456789012345678901234567890" as Address;
  const mockOwnerAddress = "0x1111111111111111111111111111111111111111" as Address;
  const mockSpenderAddress = "0x2222222222222222222222222222222222222222" as Address;
  const mockAccount = "0x3333333333333333333333333333333333333333" as Address;

  const mockPublicClient = {
    readContract: jest.fn(),
    waitForTransactionReceipt: jest.fn(),
    chain: { id: 10 },
  } as unknown as PublicClient;

  const mockWalletClient = {
    writeContract: jest.fn(),
    account: { address: mockAccount },
    chain: { id: 10 },
  } as unknown as WalletClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("checkTokenAllowance", () => {
    it("should return allowance when successful", async () => {
      const expectedAllowance = BigInt("1000000");
      mockPublicClient.readContract = jest.fn().mockResolvedValue(expectedAllowance);

      const result = await checkTokenAllowance(
        mockPublicClient,
        mockTokenAddress,
        mockOwnerAddress,
        mockSpenderAddress
      );

      expect(result).toBe(expectedAllowance);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        functionName: "allowance",
        args: [mockOwnerAddress, mockSpenderAddress],
      });
    });

    it("should return 0n when contract read fails", async () => {
      const error = new Error("Contract read failed");
      mockPublicClient.readContract = jest.fn().mockRejectedValue(error);

      const result = await checkTokenAllowance(
        mockPublicClient,
        mockTokenAddress,
        mockOwnerAddress,
        mockSpenderAddress
      );

      expect(result).toBe(0n);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to check allowance"),
        error
      );
    });

    it("should return 0n for invalid token address", async () => {
      const invalidAddress = "0xinvalid" as Address;
      mockPublicClient.readContract = jest.fn().mockRejectedValue(new Error("Invalid address"));

      const result = await checkTokenAllowance(
        mockPublicClient,
        invalidAddress,
        mockOwnerAddress,
        mockSpenderAddress
      );

      expect(result).toBe(0n);
    });

    it("should handle network errors gracefully", async () => {
      mockPublicClient.readContract = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await checkTokenAllowance(
        mockPublicClient,
        mockTokenAddress,
        mockOwnerAddress,
        mockSpenderAddress
      );

      expect(result).toBe(0n);
    });
  });

  describe("checkTokenAllowances", () => {
    it("should check allowances for multiple tokens", async () => {
      const tokenRequirements = [
        {
          tokenAddress: mockTokenAddress,
          tokenSymbol: "USDC",
          requiredAmount: BigInt("1000000"),
        },
        {
          tokenAddress: "0x9999999999999999999999999999999999999999" as Address,
          tokenSymbol: "DAI",
          requiredAmount: BigInt("500000"),
        },
      ];

      mockPublicClient.readContract = jest
        .fn()
        .mockResolvedValueOnce(BigInt("500000")) // USDC allowance
        .mockResolvedValueOnce(BigInt("1000000")); // DAI allowance

      const results = await checkTokenAllowances(
        mockPublicClient,
        mockOwnerAddress,
        mockSpenderAddress,
        tokenRequirements,
        10
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        tokenAddress: mockTokenAddress,
        tokenSymbol: "USDC",
        currentAllowance: BigInt("500000"),
        requiredAmount: BigInt("1000000"),
        needsApproval: true,
        chainId: 10,
      });
      expect(results[1]).toMatchObject({
        tokenSymbol: "DAI",
        currentAllowance: BigInt("1000000"),
        requiredAmount: BigInt("500000"),
        needsApproval: false,
        chainId: 10,
      });
    });

    it("should use chainId from token requirement if provided", async () => {
      const tokenRequirements = [
        {
          tokenAddress: mockTokenAddress,
          tokenSymbol: "USDC",
          requiredAmount: BigInt("1000000"),
          chainId: 8453,
        },
      ];

      mockPublicClient.readContract = jest.fn().mockResolvedValue(BigInt("0"));

      const results = await checkTokenAllowances(
        mockPublicClient,
        mockOwnerAddress,
        mockSpenderAddress,
        tokenRequirements,
        10
      );

      expect(results[0].chainId).toBe(8453);
    });

    it("should handle partial failures in batch allowance checks", async () => {
      const tokenRequirements = [
        {
          tokenAddress: mockTokenAddress,
          tokenSymbol: "USDC",
          requiredAmount: BigInt("1000000"),
        },
        {
          tokenAddress: "0xinvalid" as Address,
          tokenSymbol: "INVALID",
          requiredAmount: BigInt("500000"),
        },
      ];

      mockPublicClient.readContract = jest
        .fn()
        .mockResolvedValueOnce(BigInt("1000000"))
        .mockRejectedValueOnce(new Error("Invalid token"));

      const results = await checkTokenAllowances(
        mockPublicClient,
        mockOwnerAddress,
        mockSpenderAddress,
        tokenRequirements
      );

      expect(results).toHaveLength(2);
      expect(results[0].needsApproval).toBe(false);
      expect(results[1].currentAllowance).toBe(0n);
      expect(results[1].needsApproval).toBe(true);
    });
  });

  describe("approveToken", () => {
    it("should execute approval transaction successfully", async () => {
      const expectedHash = "0xapprovalhash123";
      const amount = BigInt("1000000");
      mockWalletClient.writeContract = jest.fn().mockResolvedValue(expectedHash);

      const hash = await approveToken(
        mockWalletClient,
        mockTokenAddress,
        mockSpenderAddress,
        amount,
        mockAccount
      );

      expect(hash).toBe(expectedHash);
      expect(mockWalletClient.writeContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        functionName: "approve",
        args: [mockSpenderAddress, amount],
        account: mockAccount,
        chain: null,
      });
    });

    it("should throw error when approval transaction fails", async () => {
      const error = new Error("User rejected transaction");
      mockWalletClient.writeContract = jest.fn().mockRejectedValue(error);

      await expect(
        approveToken(
          mockWalletClient,
          mockTokenAddress,
          mockSpenderAddress,
          BigInt("1000000"),
          mockAccount
        )
      ).rejects.toThrow("User rejected transaction");
    });

    it("should handle invalid token address", async () => {
      const invalidAddress = "0xinvalid" as Address;
      mockWalletClient.writeContract = jest.fn().mockRejectedValue(new Error("Invalid address"));

      await expect(
        approveToken(
          mockWalletClient,
          invalidAddress,
          mockSpenderAddress,
          BigInt("1000000"),
          mockAccount
        )
      ).rejects.toThrow("Invalid address");
    });

    it("should handle approval amount overflow", async () => {
      const overflowAmount = MAX_UINT256 + 1n;
      mockWalletClient.writeContract = jest.fn().mockRejectedValue(new Error("Amount overflow"));

      await expect(
        approveToken(
          mockWalletClient,
          mockTokenAddress,
          mockSpenderAddress,
          overflowAmount,
          mockAccount
        )
      ).rejects.toThrow("Amount overflow");
    });
  });

  describe("executeApprovals", () => {
    const mockApprovals = [
      {
        tokenAddress: mockTokenAddress,
        tokenSymbol: "USDC",
        amount: BigInt("1000000"),
      },
      {
        tokenAddress: "0x9999999999999999999999999999999999999999" as Address,
        tokenSymbol: "DAI",
        amount: BigInt("500000"),
      },
    ];

    it("should execute multiple approvals successfully", async () => {
      const txHash1 = "0xhash1";
      const txHash2 = "0xhash2";

      mockWalletClient.writeContract = jest
        .fn()
        .mockResolvedValueOnce(txHash1)
        .mockResolvedValueOnce(txHash2);

      mockPublicClient.waitForTransactionReceipt = jest
        .fn()
        .mockResolvedValueOnce({ status: "success" })
        .mockResolvedValueOnce({ status: "success" });

      const results = await executeApprovals(
        mockWalletClient,
        mockPublicClient,
        mockAccount,
        mockSpenderAddress,
        mockApprovals
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        tokenAddress: mockTokenAddress,
        tokenSymbol: "USDC",
        amount: BigInt("1000000"),
        hash: txHash1,
        status: "confirmed",
      });
      expect(results[1]).toMatchObject({
        tokenSymbol: "DAI",
        hash: txHash2,
        status: "confirmed",
      });
    });

    it("should call onProgress callback with pending status", async () => {
      const txHash = "0xhash1";
      const onProgress = jest.fn();
      let firstCallStatus: string | undefined;

      // Capture the status from the first call
      onProgress.mockImplementation((results) => {
        if (onProgress.mock.calls.length === 1) {
          firstCallStatus = results[0].status;
        }
      });

      mockWalletClient.writeContract = jest.fn().mockResolvedValue(txHash);
      mockPublicClient.waitForTransactionReceipt = jest
        .fn()
        .mockImplementation(() => Promise.resolve({ status: "success" }));

      await executeApprovals(
        mockWalletClient,
        mockPublicClient,
        mockAccount,
        mockSpenderAddress,
        [mockApprovals[0]],
        onProgress
      );

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(firstCallStatus).toBe("pending");

      // Second call should have confirmed status
      const secondCall = onProgress.mock.calls[1][0];
      expect(secondCall).toHaveLength(1);
      expect(secondCall[0]).toMatchObject({
        status: "confirmed",
        hash: txHash,
      });
    });

    it("should handle approval transaction failure", async () => {
      const error = new Error("Transaction failed");
      mockWalletClient.writeContract = jest.fn().mockRejectedValue(error);

      await expect(
        executeApprovals(mockWalletClient, mockPublicClient, mockAccount, mockSpenderAddress, [
          mockApprovals[0],
        ])
      ).rejects.toThrow("Transaction failed");

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to approve USDC"),
        error
      );
    });

    it("should handle transaction receipt with failed status", async () => {
      const txHash = "0xhash1";
      mockWalletClient.writeContract = jest.fn().mockResolvedValue(txHash);
      mockPublicClient.waitForTransactionReceipt = jest
        .fn()
        .mockResolvedValue({ status: "reverted" });

      await expect(
        executeApprovals(mockWalletClient, mockPublicClient, mockAccount, mockSpenderAddress, [
          mockApprovals[0],
        ])
      ).rejects.toThrow("Approval transaction failed for USDC");
    });

    it("should stop execution on first failure", async () => {
      const txHash1 = "0xhash1";
      mockWalletClient.writeContract = jest
        .fn()
        .mockResolvedValueOnce(txHash1)
        .mockRejectedValueOnce(new Error("Second approval failed"));

      mockPublicClient.waitForTransactionReceipt = jest
        .fn()
        .mockResolvedValue({ status: "success" });

      await expect(
        executeApprovals(
          mockWalletClient,
          mockPublicClient,
          mockAccount,
          mockSpenderAddress,
          mockApprovals
        )
      ).rejects.toThrow("Second approval failed");

      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(2);
    });

    it("should handle concurrent approval requests", async () => {
      const txHash1 = "0xhash1";
      const txHash2 = "0xhash2";

      mockWalletClient.writeContract = jest
        .fn()
        .mockResolvedValueOnce(txHash1)
        .mockResolvedValueOnce(txHash2);

      mockPublicClient.waitForTransactionReceipt = jest
        .fn()
        .mockResolvedValue({ status: "success" });

      const results = await executeApprovals(
        mockWalletClient,
        mockPublicClient,
        mockAccount,
        mockSpenderAddress,
        mockApprovals
      );

      expect(results).toHaveLength(2);
      expect(results[0].hash).toBe(txHash1);
      expect(results[1].hash).toBe(txHash2);
    });

    it("should add failed transaction to results on error", async () => {
      const error = new Error("Approval failed");
      mockWalletClient.writeContract = jest.fn().mockRejectedValue(error);
      const onProgress = jest.fn();

      try {
        await executeApprovals(
          mockWalletClient,
          mockPublicClient,
          mockAccount,
          mockSpenderAddress,
          [mockApprovals[0]],
          onProgress
        );
      } catch (_e) {
        // Expected to throw
      }

      expect(onProgress).toHaveBeenCalledWith([
        expect.objectContaining({
          status: "failed",
          tokenAddress: mockTokenAddress,
          tokenSymbol: "USDC",
        }),
      ]);
    });
  });

  describe("getApprovalAmount", () => {
    it("should return MAX_UINT256 when useExactAmount is false", () => {
      const requiredAmount = BigInt("1000000");
      const result = getApprovalAmount(requiredAmount, false);

      expect(result).toBe(MAX_UINT256);
    });

    it("should return exact amount when useExactAmount is true", () => {
      const requiredAmount = BigInt("1000000");
      const result = getApprovalAmount(requiredAmount, true);

      expect(result).toBe(requiredAmount);
    });

    it("should default to MAX_UINT256 when useExactAmount is not provided", () => {
      const requiredAmount = BigInt("1000000");
      const result = getApprovalAmount(requiredAmount);

      expect(result).toBe(MAX_UINT256);
    });

    it("should handle zero amount", () => {
      const result = getApprovalAmount(0n, true);
      expect(result).toBe(0n);
    });

    it("should handle very large amounts", () => {
      const largeAmount = MAX_UINT256 - 1n;
      const result = getApprovalAmount(largeAmount, true);
      expect(result).toBe(largeAmount);
    });
  });

  describe("MAX_UINT256 constant", () => {
    it("should be 2^256 - 1", () => {
      const expected = 2n ** 256n - 1n;
      expect(MAX_UINT256).toBe(expected);
    });
  });
});
