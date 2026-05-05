/**
 * Integration Test Utilities for Donation Feature
 *
 * Provides helper functions for setting up realistic test scenarios
 * with multiple components and hooks working together.
 */

import { waitFor } from "@testing-library/react";
import type { Address } from "viem";
import * as wagmiModule from "wagmi";
import type { SupportedToken } from "@/constants/supportedTokens";
import type { DonationPayment } from "@/store/donationCart";
import * as chainSyncValidationModule from "@/utilities/chainSyncValidation";
import * as erc20Module from "@/utilities/erc20";
import * as rpcClientModule from "@/utilities/rpcClient";
import * as walletClientFallbackModule from "@/utilities/walletClientFallback";

/**
 * Mock wallet connection with default or custom address
 */
export function mockWalletConnection(
  address: string = "0x1234567890123456789012345678901234567890",
  isConnected: boolean = true,
  chainId: number = 10
) {
  vi.mocked(wagmiModule.useAccount).mockReturnValue({
    address: isConnected ? (address as Address) : null,
    isConnected,
  } as any);

  vi.mocked(wagmiModule.useChainId).mockReturnValue(chainId as any);
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
    signTypedData: vi.fn().mockResolvedValue("0xsignature"),
    getChainId: vi.fn().mockResolvedValue(chainId),
    switchChain: vi.fn().mockResolvedValue(undefined),
    writeContract: vi.fn().mockResolvedValue("0xtxhash"),
  };

  vi.mocked(wagmiModule.useWalletClient).mockReturnValue({
    data: mockWalletClient,
    refetch: vi.fn().mockResolvedValue({ data: mockWalletClient }),
  } as any);

  return mockWalletClient;
}

/**
 * Setup mock for public client
 */
export function setupMockPublicClient(chainId: number = 10) {
  const mockPublicClient = {
    chain: { id: chainId },
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: "success",
      transactionHash: "0xtxhash",
    }),
    readContract: vi.fn(),
  };

  vi.mocked(wagmiModule.usePublicClient).mockReturnValue(mockPublicClient as any);

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
  if (shouldSucceed) {
    vi.mocked(erc20Module.executeApprovals).mockResolvedValue([
      {
        status: "confirmed",
        hash: "0xapprovalhash",
        tokenAddress,
        tokenSymbol,
      },
    ]);
  } else {
    vi.mocked(erc20Module.executeApprovals).mockRejectedValue(
      new Error("User rejected the request")
    );
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
  const mockWriteContractAsync = vi.fn();

  if (shouldSucceed) {
    mockWriteContractAsync.mockResolvedValue(txHash);
  } else {
    mockWriteContractAsync.mockRejectedValue(new Error("Transaction reverted"));
  }

  (wagmi.useWriteContract as vi.Mock).mockReturnValue({
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
export function createMockToken(overrides?: Partial<SupportedToken>): SupportedToken {
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
export function createMockPayment(overrides?: Partial<DonationPayment>): DonationPayment {
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
  // Mock wagmi hooks
  vi.mocked(wagmiModule.useAccount).mockReturnValue({
    address: "0x1234567890123456789012345678901234567890" as Address,
    isConnected: true,
  } as any);

  vi.mocked(wagmiModule.useChainId).mockReturnValue(10 as any);

  const mockPublicClient = setupMockPublicClient(10);
  const mockWalletClient = setupMockWalletClient(10);

  const mockWriteContractAsync = vi.fn().mockResolvedValue("0xtxhash");
  vi.mocked(wagmiModule.useWriteContract).mockReturnValue({
    writeContractAsync: mockWriteContractAsync,
  } as any);

  // Mock utilities
  vi.mocked(erc20Module.checkTokenAllowances).mockResolvedValue([]);
  vi.mocked(erc20Module.executeApprovals).mockResolvedValue([]);
  vi.mocked(erc20Module.getApprovalAmount).mockImplementation((amount: bigint) => amount);

  vi.mocked(rpcClientModule.getRPCClient).mockResolvedValue(mockPublicClient as any);

  vi.mocked(walletClientFallbackModule.getWalletClientWithFallback).mockResolvedValue(
    mockWalletClient as any
  );
  vi.mocked(walletClientFallbackModule.isWalletClientGoodEnough).mockReturnValue(true);

  vi.mocked(chainSyncValidationModule.validateChainSync).mockResolvedValue(true);

  return {
    mockPublicClient,
    mockWalletClient,
    mockWriteContractAsync,
  };
}

/**
 * Setup mocks for approval needed scenario
 */
export function setupApprovalNeededMocks(
  tokenAddress: string,
  tokenSymbol: string,
  requiredAmount: bigint
) {
  vi.mocked(erc20Module.checkTokenAllowances).mockResolvedValue([
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
export function createMockSwitchChain(shouldSucceed: boolean = true): vi.Mock {
  const mockSwitchChain = vi.fn();

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
export function createMockGetFreshWalletClient(chainId: number = 10): vi.Mock {
  return vi.fn().mockResolvedValue({
    chain: { id: chainId },
    account: { address: "0x1234567890123456789012345678901234567890" },
  });
}

/**
 * Clear all donation-related mocks
 */
export function clearDonationMocks() {
  vi.clearAllMocks();
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
