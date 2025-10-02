/**
 * Integration Test Utilities for Donation Feature
 *
 * Provides helper functions for setting up realistic test scenarios
 * with multiple components and hooks working together.
 */

import React, { ReactElement } from "react";
import { render, RenderOptions, waitFor } from "@testing-library/react";
import type { SupportedToken } from "@/constants/supportedTokens";
import type { DonationPayment } from "@/store/donationCart";
import type { Address } from "viem";

/**
 * Mock wallet connection with default or custom address
 */
export function mockWalletConnection(
  address: string = "0x1234567890123456789012345678901234567890",
  isConnected: boolean = true,
  chainId: number = 10
) {
  const wagmi = require("wagmi");

  (wagmi.useAccount as jest.Mock).mockReturnValue({
    address: isConnected ? address : null,
    isConnected,
  });

  (wagmi.useChainId as jest.Mock).mockReturnValue(chainId);
}

/**
 * Mock token balance for a specific token
 */
export function mockTokenBalance(
  tokenSymbol: string,
  chainId: number,
  balance: string
): Record<string, string> {
  return {
    [`${tokenSymbol}-${chainId}`]: balance,
  };
}

/**
 * Setup mock for wallet client
 */
export function setupMockWalletClient(chainId: number = 10) {
  const mockWalletClient = {
    account: { address: "0x1234567890123456789012345678901234567890" as Address },
    chain: { id: chainId },
    signTypedData: jest.fn().mockResolvedValue("0xsignature"),
  };

  const wagmi = require("wagmi");
  (wagmi.useWalletClient as jest.Mock).mockReturnValue({
    data: mockWalletClient,
    refetch: jest.fn().mockResolvedValue({ data: mockWalletClient }),
  });

  return mockWalletClient;
}

/**
 * Setup mock for public client
 */
export function setupMockPublicClient(chainId: number = 10) {
  const mockPublicClient = {
    chain: { id: chainId },
    waitForTransactionReceipt: jest.fn().mockResolvedValue({
      status: "success",
      transactionHash: "0xtxhash",
    }),
    readContract: jest.fn(),
  };

  const wagmi = require("wagmi");
  (wagmi.usePublicClient as jest.Mock).mockReturnValue(mockPublicClient);

  return mockPublicClient;
}

/**
 * Simulate successful token approval
 */
export async function simulateApproval(
  tokenAddress: string,
  tokenSymbol: string,
  shouldSucceed: boolean = true
) {
  const { executeApprovals } = require("@/utilities/erc20");

  if (shouldSucceed) {
    executeApprovals.mockResolvedValue([
      {
        status: "confirmed",
        hash: "0xapprovalhash",
        tokenAddress,
        tokenSymbol,
      },
    ]);
  } else {
    executeApprovals.mockRejectedValue(new Error("User rejected the request"));
  }
}

/**
 * Simulate transaction execution
 */
export async function simulateTransaction(
  shouldSucceed: boolean = true,
  txHash: string = "0xtransactionhash"
) {
  const wagmi = require("wagmi");
  const mockWriteContractAsync = jest.fn();

  if (shouldSucceed) {
    mockWriteContractAsync.mockResolvedValue(txHash);
  } else {
    mockWriteContractAsync.mockRejectedValue(
      new Error("Transaction reverted")
    );
  }

  (wagmi.useWriteContract as jest.Mock).mockReturnValue({
    writeContractAsync: mockWriteContractAsync,
  });

  return mockWriteContractAsync;
}

/**
 * Wait for donation flow to complete
 */
export async function waitForDonationComplete(
  checkCondition: () => boolean,
  timeout: number = 5000
) {
  await waitFor(
    () => {
      expect(checkCondition()).toBe(true);
    },
    { timeout }
  );
}

/**
 * Create mock token
 */
export function createMockToken(
  overrides?: Partial<SupportedToken>
): SupportedToken {
  return {
    address: "0xUSDC000000000000000000000000000000000000",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false,
    ...overrides,
  };
}

/**
 * Create mock native token (ETH)
 */
export function createMockNativeToken(chainId: number = 10): SupportedToken {
  return {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    chainId,
    chainName: chainId === 10 ? "Optimism" : "Base",
    isNative: true,
  };
}

/**
 * Create mock payment
 */
export function createMockPayment(
  overrides?: Partial<DonationPayment>
): DonationPayment {
  return {
    projectId: "project-1",
    amount: "100",
    token: createMockToken(),
    chainId: 10,
    ...overrides,
  };
}

/**
 * Setup default mocks for all wagmi hooks and utilities
 */
export function setupDefaultMocks() {
  const wagmi = require("wagmi");

  // Mock wagmi hooks
  (wagmi.useAccount as jest.Mock).mockReturnValue({
    address: "0x1234567890123456789012345678901234567890",
    isConnected: true,
  });

  (wagmi.useChainId as jest.Mock).mockReturnValue(10);

  const mockPublicClient = setupMockPublicClient(10);
  const mockWalletClient = setupMockWalletClient(10);

  const mockWriteContractAsync = jest.fn().mockResolvedValue("0xtxhash");
  (wagmi.useWriteContract as jest.Mock).mockReturnValue({
    writeContractAsync: mockWriteContractAsync,
  });

  // Mock utilities
  const { checkTokenAllowances, executeApprovals, getApprovalAmount } = require("@/utilities/erc20");
  checkTokenAllowances.mockResolvedValue([]);
  executeApprovals.mockResolvedValue([]);
  getApprovalAmount.mockImplementation((amount: bigint) => amount);

  const { getRPCClient } = require("@/utilities/rpcClient");
  getRPCClient.mockResolvedValue(mockPublicClient);

  const { getWalletClientWithFallback, isWalletClientGoodEnough } = require("@/utilities/walletClientFallback");
  getWalletClientWithFallback.mockResolvedValue(mockWalletClient);
  isWalletClientGoodEnough.mockReturnValue(true);

  const { validateChainSync } = require("@/utilities/chainSyncValidation");
  validateChainSync.mockResolvedValue(true);

  return {
    mockPublicClient,
    mockWalletClient,
    mockWriteContractAsync,
  };
}

/**
 * Setup mocks for approval needed scenario
 */
export function setupApprovalNeededMocks(tokenAddress: string, tokenSymbol: string, requiredAmount: bigint) {
  const { checkTokenAllowances } = require("@/utilities/erc20");

  checkTokenAllowances.mockResolvedValue([
    {
      tokenAddress: tokenAddress as Address,
      tokenSymbol,
      requiredAmount,
      currentAllowance: BigInt(0),
      needsApproval: true,
      chainId: 10,
    },
  ]);
}

/**
 * Mock payout address fetching
 */
export function createPayoutAddressGetter(
  addresses: Record<string, string>
): (projectId: string) => string {
  return (projectId: string) => addresses[projectId] || "";
}

/**
 * Mock switch chain function
 */
export function createMockSwitchChain(
  shouldSucceed: boolean = true
): jest.Mock {
  const mockSwitchChain = jest.fn();

  if (shouldSucceed) {
    mockSwitchChain.mockResolvedValue(undefined);
  } else {
    mockSwitchChain.mockRejectedValue(new Error("User rejected network switch"));
  }

  return mockSwitchChain;
}

/**
 * Mock fresh wallet client getter
 */
export function createMockGetFreshWalletClient(
  chainId: number = 10
): jest.Mock {
  return jest.fn().mockResolvedValue({
    chain: { id: chainId },
    account: { address: "0x1234567890123456789012345678901234567890" },
  });
}

/**
 * Clear all donation-related mocks
 */
export function clearDonationMocks() {
  jest.clearAllMocks();
}

/**
 * Setup localStorage mock for cart persistence tests
 */
export function setupLocalStorageMock() {
  const mockStorageData: Record<string, string> = {};

  const mockStorage = {
    getItem: (key: string) => mockStorageData[key] || null,
    setItem: (key: string, value: string) => {
      mockStorageData[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorageData[key];
    },
    clear: () => {
      Object.keys(mockStorageData).forEach((key) => delete mockStorageData[key]);
    },
  };

  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    writable: true,
  });

  return mockStorage;
}
