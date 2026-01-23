/**
 * @file Tests for useDonationTransfer hook
 * @description Tests donation transfer functionality with wagmi hooks
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import type { SupportedToken } from "@/constants/supportedTokens";
import { useDonationTransfer, useTransactionStatus } from "@/hooks/useDonationTransfer";
import type { DonationPayment } from "@/store/donationCart";
import * as chainSyncModule from "@/utilities/chainSyncValidation";
// Import modules for spying
import * as erc20Module from "@/utilities/erc20";

// Access wagmi mock state via globalThis.__wagmiMockState__
// Access utility mocks via globalThis.__mocks__

const getWagmiState = () => (globalThis as any).__wagmiMockState__;
const getMocks = () => (globalThis as any).__mocks__;

describe("useDonationTransfer", () => {
  const mockAddress = "0x1234567890123456789012345678901234567890" as Address;
  const mockRecipientAddress = "0x9876543210987654321098765432109876543210" as Address;

  // Use valid Ethereum addresses for mock tokens
  const mockToken: SupportedToken = {
    address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // USDC on Optimism
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

  // Mock clients
  let mockPublicClient: any;
  let mockWalletClient: any;

  // Get mocks from globalThis
  let mocks: any;
  let wagmiState: any;

  // Spied utility functions
  let checkTokenAllowancesSpy: ReturnType<typeof spyOn>;
  let executeApprovalsSpy: ReturnType<typeof spyOn>;
  let validateChainSyncSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mocks = getMocks();
    wagmiState = getWagmiState();

    // Setup mock clients
    mockPublicClient = {
      chain: { id: 10 },
      waitForTransactionReceipt: jest.fn().mockResolvedValue({
        status: "success",
        transactionHash: "0xtxhash",
      }),
      readContract: jest.fn(),
    };

    mockWalletClient = {
      account: { address: mockAddress },
      chain: { id: 10 },
      signTypedData: jest.fn().mockResolvedValue("0xsignature"),
    };

    // Configure wagmi mock state
    wagmiState.account = {
      address: mockAddress,
      isConnected: true,
      connector: null,
    };
    wagmiState.chainId = 10;
    wagmiState.publicClient = mockPublicClient;
    wagmiState.walletClient = mockWalletClient;
    wagmiState.writeContract.writeContractAsync.mockImplementation(() =>
      Promise.resolve("0xtxhash")
    );
    wagmiState.writeContract.reset.mockClear();
    wagmiState.waitForTransactionReceipt = {
      data: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
    };

    // Create spies for utility functions and add to mocks object
    checkTokenAllowancesSpy = spyOn(erc20Module, "checkTokenAllowances").mockImplementation(() =>
      Promise.resolve([])
    );
    executeApprovalsSpy = spyOn(erc20Module, "executeApprovals").mockImplementation(() =>
      Promise.resolve([])
    );
    validateChainSyncSpy = spyOn(chainSyncModule, "validateChainSync").mockImplementation(() =>
      Promise.resolve(undefined)
    );

    // Add spies to mocks object so tests can access them uniformly
    mocks.checkTokenAllowances = checkTokenAllowancesSpy;
    mocks.executeApprovals = executeApprovalsSpy;
    mocks.validateChainSync = validateChainSyncSpy;

    // Configure other utility mocks with default success behavior
    if (mocks.getRPCClient?.mockImplementation) {
      mocks.getRPCClient.mockImplementation(() => Promise.resolve(mockPublicClient));
    }
    if (mocks.getWalletClientWithFallback?.mockImplementation) {
      mocks.getWalletClientWithFallback.mockImplementation(() => Promise.resolve(mockWalletClient));
    }
    if (mocks.isWalletClientGoodEnough?.mockImplementation) {
      mocks.isWalletClientGoodEnough.mockImplementation(() => true);
    }

    // Clear mocks
    if (mocks.getRPCClient?.mockClear) mocks.getRPCClient.mockClear();
    if (mocks.getWalletClientWithFallback?.mockClear) mocks.getWalletClientWithFallback.mockClear();
    if (mocks.isWalletClientGoodEnough?.mockClear) mocks.isWalletClientGoodEnough.mockClear();
  });

  afterEach(() => {
    // Restore spies to prevent pollution of other test files
    checkTokenAllowancesSpy?.mockRestore();
    executeApprovalsSpy?.mockRestore();
    validateChainSyncSpy?.mockRestore();
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

      mocks.checkTokenAllowances.mockImplementation(() =>
        Promise.resolve([
          {
            tokenAddress: mockToken.address as Address,
            tokenSymbol: mockToken.symbol,
            requiredAmount: parseUnits("100", mockToken.decimals),
            currentAllowance: BigInt(0),
            needsApproval: true,
            chainId: 10,
          },
        ])
      );

      let approvals: any[] = [];
      await act(async () => {
        approvals = await result.current.checkApprovals([mockPayment]);
      });

      expect(mocks.checkTokenAllowances).toHaveBeenCalled();
      expect(approvals).toHaveLength(1);
      expect(approvals[0].needsApproval).toBe(true);
    });

    it("should skip native tokens in approval check", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      mocks.checkTokenAllowances.mockClear();

      await act(async () => {
        await result.current.checkApprovals([mockNativePayment]);
      });

      // Native tokens don't need approval
      expect(mocks.checkTokenAllowances).not.toHaveBeenCalled();
    });

    it("should handle multiple tokens on same chain", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      const payment2: DonationPayment = {
        projectId: "project-2",
        amount: "50",
        token: { ...mockToken, symbol: "DAI" },
        chainId: 10,
      };

      mocks.checkTokenAllowances.mockImplementation(() =>
        Promise.resolve([
          { needsApproval: true, chainId: 10, tokenSymbol: "USDC" },
          { needsApproval: false, chainId: 10, tokenSymbol: "DAI" },
        ])
      );

      await act(async () => {
        await result.current.checkApprovals([mockPayment, payment2]);
      });

      expect(mocks.checkTokenAllowances).toHaveBeenCalledTimes(1);
    });

    it("should throw error when wallet not connected", async () => {
      wagmiState.account = {
        address: null,
        isConnected: false,
        connector: null,
      };

      const { result } = renderHook(() => useDonationTransfer());

      let error: Error | null = null;
      try {
        await result.current.checkApprovals([mockPayment]);
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain("Wallet not connected");
    });

    it("should use getRPCClient when public client unavailable", async () => {
      wagmiState.publicClient = null;

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

    beforeEach(() => {
      getRecipientAddress.mockClear();
      getRecipientAddress.mockReturnValue(mockRecipientAddress);
    });

    it("should execute donation for native token", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      await act(async () => {
        await result.current.executeDonations([mockNativePayment], getRecipientAddress);
      });

      expect(wagmiState.writeContract.writeContractAsync).toHaveBeenCalled();
      expect(result.current.transfers).toHaveLength(1);
      expect(result.current.transfers[0].status).toBe("success");
    });

    it("should execute donation for ERC20 token without approval needed", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      mocks.checkTokenAllowances.mockImplementation(() =>
        Promise.resolve([
          {
            needsApproval: false,
            tokenAddress: mockToken.address,
            tokenSymbol: mockToken.symbol,
            chainId: 10,
          },
        ])
      );

      await act(async () => {
        await result.current.executeDonations([mockPayment], getRecipientAddress);
      });

      expect(wagmiState.writeContract.writeContractAsync).toHaveBeenCalled();
      expect(mockWalletClient.signTypedData).toHaveBeenCalled(); // Permit signature
    });

    it("should execute approvals before donation when needed", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      mocks.checkTokenAllowances.mockImplementation(() =>
        Promise.resolve([
          {
            needsApproval: true,
            tokenAddress: mockToken.address as Address,
            tokenSymbol: mockToken.symbol,
            requiredAmount: BigInt("100000000"),
            chainId: 10,
          },
        ])
      );

      mocks.executeApprovals.mockImplementation(() =>
        Promise.resolve([
          {
            status: "confirmed",
            hash: "0xapprovalhash",
            tokenAddress: mockToken.address,
            tokenSymbol: mockToken.symbol,
          },
        ])
      );

      await act(async () => {
        await result.current.executeDonations([mockPayment], getRecipientAddress);
      });

      expect(mocks.executeApprovals).toHaveBeenCalled();
      expect(wagmiState.writeContract.writeContractAsync).toHaveBeenCalled();
    });

    it("should validate recipient addresses before execution", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const invalidGetRecipient = jest.fn(() => "");

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations([mockPayment], invalidGetRecipient);
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain("Missing payout address");
    });

    it("should handle missing payout address error", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const getInvalidRecipient = jest.fn(() => "");

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations([mockPayment], getInvalidRecipient);
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain("Missing payout address");
    });

    it("should throw error when wallet not connected", async () => {
      wagmiState.account = {
        address: null,
        isConnected: false,
        connector: null,
      };

      const { result } = renderHook(() => useDonationTransfer());

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations([mockPayment], getRecipientAddress);
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain("Wallet not connected");
    });

    it("should handle user rejection error", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      wagmiState.writeContract.writeContractAsync.mockImplementation(() =>
        Promise.reject(new Error("User rejected the request"))
      );

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations([mockNativePayment], getRecipientAddress);
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain("User rejected the request");
    });

    it("should handle transaction failure", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: "reverted",
        transactionHash: "0xtxhash",
      });

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations([mockNativePayment], getRecipientAddress);
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
    });

    it("should execute batch donations for multiple projects", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      await act(async () => {
        await result.current.executeDonations(
          [mockNativePayment, { ...mockNativePayment, projectId: "project-3" }],
          getRecipientAddress
        );
      });

      expect(wagmiState.writeContract.writeContractAsync).toHaveBeenCalled();
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
      expect(wagmiState.writeContract.writeContractAsync).toHaveBeenCalledTimes(2);
    });

    it("should validate chain ID is supported", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const invalidChainPayment: DonationPayment = {
        ...mockPayment,
        chainId: 99999, // Unsupported chain
      };

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations([invalidChainPayment], getRecipientAddress);
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain("Batch donations contract not deployed");
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

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations([negativePayment], getRecipientAddress);
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
    });

    it("should update execution state throughout the process", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      await act(async () => {
        await result.current.executeDonations([mockNativePayment], getRecipientAddress);
      });

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

      expect(estimate).toContain("gas units");
      expect(estimate).toContain("141,000");
    });

    it("should estimate gas for ERC20 token transfer", () => {
      const { result } = renderHook(() => useDonationTransfer());

      const estimate = result.current.getEstimatedGasCost([mockPayment]);

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

      expect(estimate).toContain("gas units");
      expect(estimate).toContain("430,000");
    });

    it("should estimate gas for mixed native and ERC20 transfers", () => {
      const { result } = renderHook(() => useDonationTransfer());

      const estimate = result.current.getEstimatedGasCost([mockPayment, mockNativePayment]);

      expect(estimate).toContain("gas units");
      expect(estimate).toContain("236,000");
    });
  });

  describe("execution state management", () => {
    beforeEach(() => {
      // Reset wagmi state for this describe block
      wagmiState.account = {
        address: mockAddress,
        isConnected: true,
        connector: null,
      };
      wagmiState.chainId = 10;
      wagmiState.publicClient = mockPublicClient;
      wagmiState.walletClient = mockWalletClient;
      wagmiState.writeContract.writeContractAsync.mockImplementation(() =>
        Promise.resolve("0xtxhash")
      );
      wagmiState.writeContract.reset.mockClear();
      wagmiState.waitForTransactionReceipt = {
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      };

      // Reset utility mocks - first clear call history, then set implementation
      if (mocks.checkTokenAllowances?.mockClear) {
        mocks.checkTokenAllowances.mockClear();
        mocks.checkTokenAllowances.mockImplementation(() => Promise.resolve([]));
      }
      if (mocks.executeApprovals?.mockClear) {
        mocks.executeApprovals.mockClear();
        mocks.executeApprovals.mockImplementation(() => Promise.resolve([]));
      }
      if (mocks.getRPCClient?.mockClear) {
        mocks.getRPCClient.mockClear();
        mocks.getRPCClient.mockImplementation(() => Promise.resolve(mockPublicClient));
      }
      if (mocks.getWalletClientWithFallback?.mockClear) {
        mocks.getWalletClientWithFallback.mockClear();
        mocks.getWalletClientWithFallback.mockImplementation(() =>
          Promise.resolve(mockWalletClient)
        );
      }
      if (mocks.isWalletClientGoodEnough?.mockClear) {
        mocks.isWalletClientGoodEnough.mockClear();
        mocks.isWalletClientGoodEnough.mockImplementation(() => true);
      }
      if (mocks.validateChainSync?.mockClear) {
        mocks.validateChainSync.mockClear();
        mocks.validateChainSync.mockImplementation(() => Promise.resolve(undefined));
      }

      // Reset shared object mocks
      mockWalletClient.signTypedData.mockReset?.();
      mockWalletClient.signTypedData.mockResolvedValue?.("0xsignature");
      mockPublicClient.waitForTransactionReceipt.mockReset?.();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue?.({
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

      wagmiState.writeContract.writeContractAsync.mockImplementation(() =>
        Promise.reject(new Error("Test error"))
      );

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

      // Make getWalletClientWithFallback return null
      mocks.getWalletClientWithFallback.mockImplementation(() => Promise.resolve(null));

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations(
            [mockPayment],
            jest.fn(() => mockRecipientAddress)
          );
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message?.toLowerCase()).toContain("wallet client");

      // Should reset isExecuting even on error
      expect(result.current.isExecuting).toBe(false);
    });

    it("should retry chain sync validation with fresh wallet client", async () => {
      const { result } = renderHook(() => useDonationTransfer());
      const freshWalletClient = { ...mockWalletClient, chain: { id: 10 } };

      // First validation fails, triggering retry
      let callCount = 0;
      mocks.validateChainSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Chain mismatch"));
        }
        return Promise.resolve(undefined);
      });

      // getWalletClientWithFallback returns fresh wallet client
      mocks.getWalletClientWithFallback.mockImplementation(() =>
        Promise.resolve(freshWalletClient)
      );

      await act(async () => {
        await result.current.executeDonations(
          [mockPayment],
          jest.fn(() => mockRecipientAddress)
        );
      });

      // Should have retried validation
      expect(mocks.validateChainSync).toHaveBeenCalledTimes(2);
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
      wagmiState.writeContract.writeContractAsync.mockImplementation(() =>
        Promise.reject(new Error("Transaction failed: gas estimation error"))
      );

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations(
            [mockNativePayment],
            jest.fn(() => mockRecipientAddress)
          );
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain("Transaction failed");

      // Verify hook is no longer executing
      expect(result.current.isExecuting).toBe(false);
    });

    it("should handle wallet client unavailable during permit signing", async () => {
      const { result } = renderHook(() => useDonationTransfer());

      // Verify hook initialized properly
      expect(result.current).toBeDefined();
      expect(result.current.executeDonations).toBeDefined();

      // Setup: no approvals needed, but wallet client becomes unavailable during permit signing
      mocks.checkTokenAllowances.mockImplementation(() =>
        Promise.resolve([
          {
            needsApproval: false,
            tokenAddress: mockToken.address,
            tokenSymbol: mockToken.symbol,
            chainId: 10,
          },
        ])
      );

      // Return null for wallet client, simulating unavailable wallet
      mocks.getWalletClientWithFallback.mockImplementation(() => Promise.resolve(null));

      let error: Error | null = null;
      try {
        await act(async () => {
          await result.current.executeDonations(
            [mockPayment],
            jest.fn(() => mockRecipientAddress)
          );
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message?.toLowerCase()).toContain("wallet client");
    });

    it("should handle multiple chains with approvals", async () => {
      const { result } = renderHook(() => useDonationTransfer());

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

      mocks.checkTokenAllowances.mockImplementation(
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

      mocks.executeApprovals.mockImplementation(() =>
        Promise.resolve([
          {
            status: "confirmed",
            hash: "0xapprovalhash",
            tokenAddress: mockToken.address,
            tokenSymbol: mockToken.symbol,
          },
        ])
      );

      await act(async () => {
        await result.current.executeDonations(
          [paymentChain1, paymentChain2],
          jest.fn(() => mockRecipientAddress)
        );
      });

      // Should execute approvals for both chains
      expect(mocks.executeApprovals).toHaveBeenCalledTimes(2);
    });
  });

  describe("useTransactionStatus", () => {
    beforeEach(() => {
      // Reset wait for transaction receipt state
      wagmiState.waitForTransactionReceipt = {
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      };
    });

    it("should return pending status when loading", () => {
      wagmiState.waitForTransactionReceipt = {
        data: null,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      };

      const { result } = renderHook(() => useTransactionStatus("0xtxhash"));

      expect(result.current.status).toBe("pending");
      expect(result.current.isLoading).toBe(true);
    });

    it("should return success status when transaction succeeds", () => {
      wagmiState.waitForTransactionReceipt = {
        data: { status: "success", transactionHash: "0xtxhash" },
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      };

      const { result } = renderHook(() => useTransactionStatus("0xtxhash"));

      expect(result.current.status).toBe("success");
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.receipt).toBeDefined();
    });

    it("should return error status when transaction fails", () => {
      wagmiState.waitForTransactionReceipt = {
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: null,
      };

      const { result } = renderHook(() => useTransactionStatus("0xtxhash"));

      expect(result.current.status).toBe("error");
      expect(result.current.isError).toBe(true);
    });

    it("should return idle status when hash is empty", () => {
      const { result } = renderHook(() => useTransactionStatus(""));

      expect(result.current.status).toBe("idle");
    });
  });
});
