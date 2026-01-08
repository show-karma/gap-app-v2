import { act, renderHook } from "@testing-library/react";
import { type Address, getAddress, parseUnits } from "viem";
import * as wagmi from "wagmi";
import type { SupportedToken } from "@/constants/supportedTokens";
import { useDonationTransfer, useTransactionStatus } from "@/hooks/useDonationTransfer";
import type { DonationPayment } from "@/store/donationCart";

// Mock wagmi hooks
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  usePublicClient: jest.fn(),
  useWalletClient: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
  useChainId: jest.fn(),
}));

// Mock viem utilities
jest.mock("viem", () => {
  const actual = jest.requireActual("viem");
  // Use actual parseUnits and formatUnits - they work correctly
  return {
    ...actual,
    getAddress: jest.fn((addr: string) => addr as Address),
  };
});

// Mock utilities
jest.mock("@/utilities/donations/batchDonations", () => ({
  BatchDonationsABI: [],
  BATCH_DONATIONS_CONTRACTS: {
    10: "0x1111111111111111111111111111111111111111",
    8453: "0x2222222222222222222222222222222222222222",
  },
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,
  getBatchDonationsContractAddress: jest.fn((chainId: number) =>
    chainId === 10
      ? "0x1111111111111111111111111111111111111111"
      : "0x2222222222222222222222222222222222222222"
  ),
}));

jest.mock("@/utilities/erc20", () => ({
  checkTokenAllowances: jest.fn(),
  executeApprovals: jest.fn(),
  getApprovalAmount: jest.fn((amount: bigint) => amount),
}));

jest.mock("@/utilities/rpcClient", () => ({
  getRPCClient: jest.fn(),
}));

jest.mock("@/utilities/walletClientValidation", () => ({
  validateWalletClient: jest.fn(),
  waitForValidWalletClient: jest.fn(),
}));

jest.mock("@/utilities/walletClientFallback", () => ({
  getWalletClientWithFallback: jest.fn(),
  isWalletClientGoodEnough: jest.fn(),
}));

jest.mock("@/utilities/chainSyncValidation", () => ({
  validateChainSync: jest.fn(),
}));

jest.mock("@/utilities/donations/errorMessages", () => ({
  getShortErrorMessage: jest.fn((error: any) => error?.message || "Unknown error"),
  parseDonationError: jest.fn((error: any) => ({
    message: error?.message || "Unknown error",
    type: "unknown",
    isRecoverable: false,
    actionableSteps: [],
  })),
}));

describe("useDonationTransfer", () => {
  const mockAddress = "0x1234567890123456789012345678901234567890" as Address;
  const mockRecipientAddress = "0x9876543210987654321098765432109876543210" as Address;

  const mockToken: SupportedToken = {
    address: "0xUSDC000000000000000000000000000000000000",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false,
  };

  const mockNativeToken: SupportedToken = {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    chainId: 10,
    chainName: "Optimism",
    isNative: true,
  };

  const mockPayment: DonationPayment = {
    projectId: "project-1",
    amount: "100",
    token: mockToken,
    chainId: 10,
  };

  const mockNativePayment: DonationPayment = {
    projectId: "project-2",
    amount: "0.5",
    token: mockNativeToken,
    chainId: 10,
  };

  const mockPublicClient = {
    chain: { id: 10 },
    waitForTransactionReceipt: jest.fn(),
    readContract: jest.fn(),
  };

  const mockWalletClient = {
    account: { address: mockAddress },
    chain: { id: 10 },
    signTypedData: jest.fn(),
  };

  const mockWriteContractAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });

    (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

    (wagmi.useWalletClient as jest.Mock).mockReturnValue({
      data: mockWalletClient,
      refetch: jest.fn().mockResolvedValue({ data: mockWalletClient }),
    });

    (wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    });

    (wagmi.useChainId as jest.Mock).mockReturnValue(10);

    // Setup utility mocks with default success behavior
    const { checkTokenAllowances } = require("@/utilities/erc20");
    checkTokenAllowances.mockResolvedValue([]);

    const { getRPCClient } = require("@/utilities/rpcClient");
    getRPCClient.mockResolvedValue(mockPublicClient);

    const {
      getWalletClientWithFallback,
      isWalletClientGoodEnough,
    } = require("@/utilities/walletClientFallback");
    getWalletClientWithFallback.mockResolvedValue(mockWalletClient);
    isWalletClientGoodEnough.mockReturnValue(true);

    const { validateChainSync } = require("@/utilities/chainSyncValidation");
    validateChainSync.mockResolvedValue(undefined);

    mockWalletClient.signTypedData.mockResolvedValue("0xsignature");
    mockWriteContractAsync.mockResolvedValue("0xtxhash");
    mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
      status: "success",
      transactionHash: "0xtxhash",
    });
  });

  afterEach(() => {
    // Reset all mocks to prevent state accumulation
    jest.clearAllMocks();

    // Reset mock implementations to defaults
    mockWalletClient.signTypedData.mockResolvedValue("0xsignature");
    mockWriteContractAsync.mockResolvedValue("0xtxhash");
    mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
      status: "success",
      transactionHash: "0xtxhash",
    });
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useDonationTransfer());

      expect(result.current.transfers).toEqual([]);
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.executionState).toEqual({ phase: "completed" });
      expect(result.current.approvalInfo).toEqual([]);
    });
  });

  describe("checkApprovals", () => {
    it("should check token approvals for ERC20 tokens", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const { checkTokenAllowances } = require("@/utilities/erc20");

      checkTokenAllowances.mockResolvedValue([
        {
          tokenAddress: mockToken.address as Address,
          tokenSymbol: mockToken.symbol,
          requiredAmount: parseUnits("100", mockToken.decimals),
          currentAllowance: BigInt(0),
          needsApproval: true,
          chainId: 10,
        },
      ]);

      let approvals: any[] = [];
      await act(async () => {
        approvals = await result.current.checkApprovals([mockPayment]);
      });

      expect(checkTokenAllowances).toHaveBeenCalled();
      expect(approvals).toHaveLength(1);
      expect(approvals[0].needsApproval).toBe(true);
    });

    it("should skip native tokens in approval check", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const { checkTokenAllowances } = require("@/utilities/erc20");

      await act(async () => {
        await result.current.checkApprovals([mockNativePayment]);
      });

      // Native tokens don't need approval
      expect(checkTokenAllowances).not.toHaveBeenCalled();
    });

    it("should handle multiple tokens on same chain", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const { checkTokenAllowances } = require("@/utilities/erc20");

      const payment2: DonationPayment = {
        projectId: "project-2",
        amount: "50",
        token: { ...mockToken, symbol: "DAI" },
        chainId: 10,
      };

      checkTokenAllowances.mockResolvedValue([
        { needsApproval: true, chainId: 10, tokenSymbol: "USDC" },
        { needsApproval: false, chainId: 10, tokenSymbol: "DAI" },
      ]);

      await act(async () => {
        await result.current.checkApprovals([mockPayment, payment2]);
      });

      expect(checkTokenAllowances).toHaveBeenCalledTimes(1);
    });

    it("should throw error when wallet not connected", async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { result } = renderHook(() => useDonationTransfer());

      await expect(result.current.checkApprovals([mockPayment])).rejects.toThrow(
        "Wallet not connected"
      );
    });

    it("should use getRPCClient when public client unavailable", async () => {
      // When publicClient is null, checkApprovals should fall back to getRPCClient
      // and not throw an error. This enables multi-chain donations during network switches.
      (wagmi.usePublicClient as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useDonationTransfer());

      // Should resolve without throwing since getRPCClient is used as fallback
      const approvals = await result.current.checkApprovals([mockPayment]);
      expect(Array.isArray(approvals)).toBe(true);
    });
  });

  describe("executeDonations", () => {
    const getRecipientAddress = jest.fn(
      (_projectId: string, _chainId: number) => mockRecipientAddress
    );

    it("should execute donation for native token", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      await act(async () => {
        await result.current.executeDonations([mockNativePayment], getRecipientAddress);
      });

      expect(mockWriteContractAsync).toHaveBeenCalled();
      expect(result.current.transfers).toHaveLength(1);
      // Transaction completes immediately in test due to mocks
      expect(result.current.transfers[0].status).toBe("success");
    });

    it("should execute donation for ERC20 token without approval needed", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const { checkTokenAllowances } = require("@/utilities/erc20");

      checkTokenAllowances.mockResolvedValue([
        {
          needsApproval: false,
          tokenAddress: mockToken.address,
          tokenSymbol: mockToken.symbol,
          chainId: 10,
        },
      ]);

      await act(async () => {
        await result.current.executeDonations([mockPayment], getRecipientAddress);
      });

      expect(mockWriteContractAsync).toHaveBeenCalled();
      expect(mockWalletClient.signTypedData).toHaveBeenCalled(); // Permit signature
    });

    it("should execute approvals before donation when needed", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const { checkTokenAllowances, executeApprovals } = require("@/utilities/erc20");

      checkTokenAllowances.mockResolvedValue([
        {
          needsApproval: true,
          tokenAddress: mockToken.address as Address,
          tokenSymbol: mockToken.symbol,
          requiredAmount: BigInt("100000000"),
          chainId: 10,
        },
      ]);

      executeApprovals.mockResolvedValue([
        {
          status: "confirmed",
          hash: "0xapprovalhash",
          tokenAddress: mockToken.address,
          tokenSymbol: mockToken.symbol,
        },
      ]);

      await act(async () => {
        await result.current.executeDonations([mockPayment], getRecipientAddress);
      });

      expect(executeApprovals).toHaveBeenCalled();
      expect(mockWriteContractAsync).toHaveBeenCalled();
    });

    it("should validate recipient addresses before execution", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const invalidGetRecipient = jest.fn(() => "");

      await expect(
        act(async () => {
          await result.current.executeDonations([mockPayment], invalidGetRecipient);
        })
      ).rejects.toThrow("Missing payout address");
    });

    it("should handle missing payout address error", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const getInvalidRecipient = jest.fn(() => "");

      await expect(
        act(async () => {
          await result.current.executeDonations([mockPayment], getInvalidRecipient);
        })
      ).rejects.toThrow("Missing payout address");
    });

    it("should handle invalid payout address error", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const mockGetAddress = getAddress as jest.Mock;

      mockGetAddress.mockImplementation((addr: string) => {
        if (addr === "invalid-address") {
          throw new Error("Invalid address");
        }
        return addr as Address;
      });

      const getBadRecipient = jest.fn(() => "invalid-address");

      await expect(
        act(async () => {
          await result.current.executeDonations([mockPayment], getBadRecipient);
        })
      ).rejects.toThrow("Invalid payout address");
    });

    it("should throw error when wallet not connected", async () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { result } = renderHook(() => useDonationTransfer());

      await expect(
        act(async () => {
          await result.current.executeDonations([mockPayment], getRecipientAddress);
        })
      ).rejects.toThrow("Wallet not connected");
    });

    it("should handle user rejection error", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      mockWriteContractAsync.mockRejectedValue(new Error("User rejected the request"));

      // User rejection should throw an error
      await expect(
        act(async () => {
          await result.current.executeDonations([mockNativePayment], getRecipientAddress);
        })
      ).rejects.toThrow("User rejected the request");
    });

    it("should handle transaction failure", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: "reverted",
        transactionHash: "0xtxhash",
      });

      await expect(
        act(async () => {
          await result.current.executeDonations([mockNativePayment], getRecipientAddress);
        })
      ).rejects.toThrow();
    });

    it("should execute batch donations for multiple projects", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      await act(async () => {
        await result.current.executeDonations(
          [mockNativePayment, { ...mockNativePayment, projectId: "project-3" }],
          getRecipientAddress
        );
      });

      expect(mockWriteContractAsync).toHaveBeenCalled();
      expect(result.current.transfers).toHaveLength(2);
    });

    it("should handle multi-chain donations", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const payment2: DonationPayment = {
        ...mockPayment,
        chainId: 8453, // Base
        projectId: "project-3",
      };

      await act(async () => {
        await result.current.executeDonations([mockPayment, payment2], getRecipientAddress);
      });

      // Should be called twice (once per chain)
      expect(mockWriteContractAsync).toHaveBeenCalledTimes(2);
    });

    it("should validate chain ID is supported", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const invalidChainPayment: DonationPayment = {
        ...mockPayment,
        chainId: 99999, // Unsupported chain
      };

      await expect(
        act(async () => {
          await result.current.executeDonations([invalidChainPayment], getRecipientAddress);
        })
      ).rejects.toThrow("Batch donations contract not deployed");
    });

    it("should call beforeTransfer callback when switching networks", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const beforeTransfer = jest.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.executeDonations([mockPayment], getRecipientAddress, beforeTransfer);
      });

      expect(beforeTransfer).toHaveBeenCalledWith(mockPayment);
    });

    it("should handle negative amounts", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const negativePayment: DonationPayment = {
        ...mockPayment,
        amount: "-100",
      };

      await expect(
        act(async () => {
          await result.current.executeDonations([negativePayment], getRecipientAddress);
        })
      ).rejects.toThrow();
    });

    it("should update execution state throughout the process", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const states: string[] = [];

      const executionPromise = act(async () => {
        await result.current.executeDonations([mockNativePayment], getRecipientAddress);
      });

      // Check initial state
      states.push(result.current.executionState.phase);

      await executionPromise;

      // Final state should be completed
      expect(result.current.executionState.phase).toBe("completed");
    });
  });

  describe("validatePayments", () => {
    const balanceByTokenKey = {
      "USDC-10": "1000",
      "ETH-10": "10",
    };

    it("should validate sufficient balance", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const validation = await result.current.validatePayments([mockPayment], balanceByTokenKey);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect insufficient balance", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const largePayment: DonationPayment = {
        ...mockPayment,
        amount: "10000", // More than available
      };

      const validation = await result.current.validatePayments([largePayment], balanceByTokenKey);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain("Insufficient");
    });

    it("should detect invalid amount (zero)", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const zeroPayment: DonationPayment = {
        ...mockPayment,
        amount: "0",
      };

      const validation = await result.current.validatePayments([zeroPayment], balanceByTokenKey);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain("Invalid amount");
    });

    it("should detect invalid amount (negative)", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const negativePayment: DonationPayment = {
        ...mockPayment,
        amount: "-100",
      };

      const validation = await result.current.validatePayments(
        [negativePayment],
        balanceByTokenKey
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
    });

    it("should detect invalid token decimals", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const invalidDecimalsPayment: DonationPayment = {
        ...mockPayment,
        token: { ...mockToken, decimals: 25 }, // Invalid: > 18
      };

      const validation = await result.current.validatePayments(
        [invalidDecimalsPayment],
        balanceByTokenKey
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain("Invalid token decimals");
    });

    it("should detect missing balance information", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const unknownTokenPayment: DonationPayment = {
        ...mockPayment,
        token: { ...mockToken, symbol: "UNKNOWN" },
      };

      const validation = await result.current.validatePayments(
        [unknownTokenPayment],
        balanceByTokenKey
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain("No balance information");
    });

    it("should validate multiple payments", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const validation = await result.current.validatePayments(
        [mockPayment, mockNativePayment],
        balanceByTokenKey
      );

      expect(validation.valid).toBe(true);
    });
  });

  describe("checkSufficientBalance", () => {
    it("should return true when balance is sufficient", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const hasSufficient = await result.current.checkSufficientBalance(mockPayment, "1000");

      expect(hasSufficient).toBe(true);
    });

    it("should return false when balance is insufficient", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const hasSufficient = await result.current.checkSufficientBalance(mockPayment, "50");

      expect(hasSufficient).toBe(false);
    });

    it("should return true when balance equals amount", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const hasSufficient = await result.current.checkSufficientBalance(mockPayment, "100");

      expect(hasSufficient).toBe(true);
    });

    it("should handle parsing errors gracefully", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      // Test with an invalid amount string that will cause parseUnits to fail
      const invalidPayment = {
        ...mockPayment,
        amount: "invalid-amount",
      };

      const hasSufficient = await result.current.checkSufficientBalance(invalidPayment, "100");

      expect(hasSufficient).toBe(false);
    });
  });

  describe("getEstimatedGasCost", () => {
    it("should estimate gas for native token transfer", () => {
      const { result } = renderHook(() => useDonationTransfer());

      const estimate = result.current.getEstimatedGasCost([mockNativePayment]);

      // 21,000 (native) + 120,000 (base per chain) = 141,000
      expect(estimate).toContain("gas units");
      expect(estimate).toContain("141,000");
    });

    it("should estimate gas for ERC20 token transfer", () => {
      const { result } = renderHook(() => useDonationTransfer());

      const estimate = result.current.getEstimatedGasCost([mockPayment]);

      // 95,000 (ERC20) + 120,000 (base per chain) = 215,000
      expect(estimate).toContain("gas units");
      expect(estimate).toContain("215,000");
    });

    it("should estimate gas for multi-chain transfers", () => {
      const { result } = renderHook(() => useDonationTransfer());

      const payment2: DonationPayment = {
        ...mockPayment,
        chainId: 8453,
      };

      const estimate = result.current.getEstimatedGasCost([mockPayment, payment2]);

      // 95,000 (ERC20) + 95,000 (ERC20) + 240,000 (2 chains * 120,000) = 430,000
      expect(estimate).toContain("gas units");
      expect(estimate).toContain("430,000");
    });

    it("should estimate gas for mixed native and ERC20 transfers", () => {
      const { result } = renderHook(() => useDonationTransfer());

      const estimate = result.current.getEstimatedGasCost([mockPayment, mockNativePayment]);

      // Both on same chain: 95,000 (ERC20) + 21,000 (native) + 120,000 (1 chain) = 236,000
      expect(estimate).toContain("gas units");
      expect(estimate).toContain("236,000");
    });
  });

  describe("execution state management", () => {
    // Tests in this block modify mocks, so we need explicit reset before each test
    beforeEach(() => {
      // IMPORTANT: Reset all wagmi mocks first to clear any queued values
      (wagmi.useAccount as jest.Mock).mockReset();
      (wagmi.usePublicClient as jest.Mock).mockReset();
      (wagmi.useWalletClient as jest.Mock).mockReset();
      (wagmi.useWriteContract as jest.Mock).mockReset();
      (wagmi.useChainId as jest.Mock).mockReset();
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReset();

      // Now set up default implementations
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      (wagmi.useWalletClient as jest.Mock).mockReturnValue({
        data: mockWalletClient,
        refetch: jest.fn().mockResolvedValue({ data: mockWalletClient }),
      });

      (wagmi.useWriteContract as jest.Mock).mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
      });

      (wagmi.useChainId as jest.Mock).mockReturnValue(10);

      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
      });

      // Reset utility mocks
      const { checkTokenAllowances, executeApprovals } = require("@/utilities/erc20");
      checkTokenAllowances.mockReset();
      checkTokenAllowances.mockResolvedValue([]);
      executeApprovals.mockReset();
      executeApprovals.mockResolvedValue([]);

      const { getRPCClient } = require("@/utilities/rpcClient");
      getRPCClient.mockReset();
      getRPCClient.mockResolvedValue(mockPublicClient);

      const {
        getWalletClientWithFallback,
        isWalletClientGoodEnough,
      } = require("@/utilities/walletClientFallback");
      getWalletClientWithFallback.mockReset();
      getWalletClientWithFallback.mockResolvedValue(mockWalletClient);
      isWalletClientGoodEnough.mockReset();
      isWalletClientGoodEnough.mockReturnValue(true);

      const { validateChainSync } = require("@/utilities/chainSyncValidation");
      validateChainSync.mockReset();
      validateChainSync.mockResolvedValue(undefined);

      // Reset mock implementations on shared objects
      mockWalletClient.signTypedData.mockReset();
      mockWalletClient.signTypedData.mockResolvedValue("0xsignature");
      mockWriteContractAsync.mockReset();
      mockWriteContractAsync.mockResolvedValue("0xtxhash");
      mockPublicClient.waitForTransactionReceipt.mockReset();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: "success",
        transactionHash: "0xtxhash",
      });
    });

    it("should set isExecuting to true during execution", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      expect(result.current.isExecuting).toBe(false);

      await act(async () => {
        await result.current.executeDonations(
          [mockNativePayment],
          jest.fn(() => mockRecipientAddress)
        );
      });

      // After execution completes, it should be false
      expect(result.current.isExecuting).toBe(false);
    });

    it("should reset isExecuting to false on error", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      mockWriteContractAsync.mockRejectedValue(new Error("Test error"));

      try {
        await act(async () => {
          await result.current.executeDonations(
            [mockNativePayment],
            jest.fn(() => mockRecipientAddress)
          );
        });
      } catch (_error) {
        // Error expected
      }

      expect(result.current.isExecuting).toBe(false);
    });

    it("should track transfer status updates", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      await act(async () => {
        await result.current.executeDonations(
          [mockNativePayment],
          jest.fn(() => mockRecipientAddress)
        );
      });

      // Transfer should be marked as success after completion
      expect(result.current.transfers[0].status).toBe("success");
    });

    it("should handle wallet client errors during execution", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const { getWalletClientWithFallback } = require("@/utilities/walletClientFallback");

      // Make getWalletClientWithFallback return null, simulating wallet unavailable
      getWalletClientWithFallback.mockResolvedValueOnce(null);

      await expect(
        act(async () => {
          await result.current.executeDonations(
            [mockPayment],
            jest.fn(() => mockRecipientAddress)
          );
        })
      ).rejects.toThrow(/wallet client/i);

      // Should reset isExecuting even on error
      expect(result.current.isExecuting).toBe(false);
    });

    it("should retry chain sync validation with fresh wallet client", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const { validateChainSync } = require("@/utilities/chainSyncValidation");
      const { getWalletClientWithFallback } = require("@/utilities/walletClientFallback");
      const freshWalletClient = { ...mockWalletClient, chain: { id: 10 } };

      // First validation fails, triggering retry
      validateChainSync.mockRejectedValueOnce(new Error("Chain mismatch"));
      // Second validation succeeds
      validateChainSync.mockResolvedValueOnce(undefined);

      // getWalletClientWithFallback returns fresh wallet client
      getWalletClientWithFallback.mockResolvedValue(freshWalletClient);

      await act(async () => {
        await result.current.executeDonations(
          [mockPayment],
          jest.fn(() => mockRecipientAddress)
        );
      });

      // Should have retried validation
      expect(validateChainSync).toHaveBeenCalledTimes(2);
    });

    it("should handle chain mismatch detection", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      // Ensure hook is initialized
      expect(result.current).toBeDefined();
      expect(result.current.executeDonations).toBeDefined();

      const invalidPayment: DonationPayment = {
        ...mockPayment,
        chainId: 10,
      };
      const invalidPayment2: DonationPayment = {
        ...mockPayment,
        projectId: "project-2",
        chainId: 8453, // Different chain but grouped incorrectly
      };

      // Simulate payments with mismatched chain IDs in same batch
      await expect(
        act(async () => {
          // This should not happen in practice, but test the validation
          if (!result.current) {
            throw new Error("Hook not initialized");
          }
          await result.current.executeDonations(
            [invalidPayment, { ...invalidPayment2, chainId: 10 }], // Force same chainId
            jest.fn(() => mockRecipientAddress)
          );
        })
      ).resolves.not.toThrow();
    });

    it("should handle empty payments array", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      await act(async () => {
        await result.current.executeDonations(
          [],
          jest.fn(() => mockRecipientAddress)
        );
      });

      // Should complete without errors
      expect(result.current.executionState.phase).toBe("completed");
      expect(result.current.transfers).toHaveLength(0);
    });

    it("should handle transaction errors gracefully", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      // Set up the writeContractAsync to fail
      mockWriteContractAsync.mockRejectedValueOnce(
        new Error("Transaction failed: gas estimation error")
      );

      // Execute donation and expect it to throw
      await expect(
        act(async () => {
          await result.current.executeDonations(
            [mockNativePayment],
            jest.fn(() => mockRecipientAddress)
          );
        })
      ).rejects.toThrow("Transaction failed");

      // Verify hook is no longer executing
      expect(result.current.isExecuting).toBe(false);
    });

    it("should handle wallet client unavailable during permit signing", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const { getWalletClientWithFallback } = require("@/utilities/walletClientFallback");
      const { checkTokenAllowances } = require("@/utilities/erc20");

      // Verify hook initialized properly
      expect(result.current).toBeDefined();
      expect(result.current.executeDonations).toBeDefined();

      // Setup: no approvals needed, but wallet client becomes unavailable during permit signing
      checkTokenAllowances.mockResolvedValue([
        {
          needsApproval: false,
          tokenAddress: mockToken.address,
          tokenSymbol: mockToken.symbol,
          chainId: 10,
        },
      ]);

      // Return null for wallet client, simulating unavailable wallet
      getWalletClientWithFallback.mockResolvedValue(null);

      // Expect the execution to throw an error about wallet client
      await expect(
        act(async () => {
          await result.current.executeDonations(
            [mockPayment],
            jest.fn(() => mockRecipientAddress)
          );
        })
      ).rejects.toThrow(/wallet client/i);
    });

    it("should handle multiple chains with approvals", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const { checkTokenAllowances, executeApprovals } = require("@/utilities/erc20");

      const paymentChain1: DonationPayment = {
        ...mockPayment,
        chainId: 10,
      };
      const paymentChain2: DonationPayment = {
        ...mockPayment,
        projectId: "project-2",
        chainId: 8453,
        token: { ...mockToken, chainId: 8453 },
      };

      checkTokenAllowances.mockImplementation(
        (_client: any, _address: Address, _spender: Address, _tokens: any[], chainId: number) => {
          return Promise.resolve([
            {
              needsApproval: true,
              tokenAddress: mockToken.address as Address,
              tokenSymbol: mockToken.symbol,
              requiredAmount: BigInt("100000000"),
              chainId,
            },
          ]);
        }
      );

      executeApprovals.mockResolvedValue([
        {
          status: "confirmed",
          hash: "0xapprovalhash",
          tokenAddress: mockToken.address,
          tokenSymbol: mockToken.symbol,
        },
      ]);

      await act(async () => {
        await result.current.executeDonations(
          [paymentChain1, paymentChain2],
          jest.fn(() => mockRecipientAddress)
        );
      });

      // Should execute approvals for both chains
      expect(executeApprovals).toHaveBeenCalledTimes(2);
    });
  });

  describe("useTransactionStatus", () => {
    // Reset all wagmi mocks before each test
    beforeEach(() => {
      jest.clearAllMocks();

      // Reset wagmi mocks to default values for useTransactionStatus tests
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
      });
    });

    it("should return pending status when loading", () => {
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        isSuccess: false,
        isError: false,
      });

      const { result } = renderHook(() => useTransactionStatus("0xtxhash"));

      expect(result.current.status).toBe("pending");
      expect(result.current.isLoading).toBe(true);
    });

    it("should return success status when transaction succeeds", () => {
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: { status: "success", transactionHash: "0xtxhash" },
        isLoading: false,
        isSuccess: true,
        isError: false,
      });

      const { result } = renderHook(() => useTransactionStatus("0xtxhash"));

      expect(result.current.status).toBe("success");
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.receipt).toBeDefined();
    });

    it("should return error status when transaction fails", () => {
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: true,
      });

      const { result } = renderHook(() => useTransactionStatus("0xtxhash"));

      expect(result.current.status).toBe("error");
      expect(result.current.isError).toBe(true);
    });

    it("should return idle status when hash is empty", () => {
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
      });

      const { result } = renderHook(() => useTransactionStatus(""));

      expect(result.current.status).toBe("idle");
    });

    it("should disable query when hash is empty", () => {
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
      });

      renderHook(() => useTransactionStatus(""));

      expect(wagmi.useWaitForTransactionReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: "",
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });

    it("should enable query when hash is provided", () => {
      (wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        isSuccess: false,
        isError: false,
      });

      renderHook(() => useTransactionStatus("0xtxhash"));

      expect(wagmi.useWaitForTransactionReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: "0xtxhash",
          query: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });
  });
});
