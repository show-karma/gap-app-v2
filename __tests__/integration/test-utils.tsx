/**
 * Integration Test Utilities for Donation Feature
 *
 * Provides helper functions for setting up realistic test scenarios
 * with multiple components and hooks working together.
 *
 * NOTE: This file has been updated to work with Bun's test runner.
 * Mocks are pre-registered in tests/bun-setup.ts and configured via
 * the global mock state objects.
 */

import { mock } from "bun:test";
import { waitFor } from "@testing-library/react";
import type { Address } from "viem";
import type { SupportedToken } from "@/constants/supportedTokens";
import type { DonationPayment } from "@/store/donationCart";

// Access the configurable wagmi mock state
const getWagmiMockState = () => (globalThis as any).__wagmiMockState__;
const getMocks = () => (globalThis as any).__mocks__;

/**
 * Mock wallet connection with default or custom address
 */
export function mockWalletConnection(
  address: string = "0x1234567890123456789012345678901234567890",
  isConnected: boolean = true,
  chainId: number = 10
) {
  const wagmiState = getWagmiMockState();
  wagmiState.account = {
    address: isConnected ? address : undefined,
    isConnected,
    connector: null,
  };
  wagmiState.chainId = chainId;
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
    signTypedData: mock(() => Promise.resolve("0xsignature")),
  };

  const wagmiState = getWagmiMockState();
  wagmiState.walletClient = mockWalletClient;

  return mockWalletClient;
}

/**
 * Setup mock for public client
 */
export function setupMockPublicClient(chainId: number = 10) {
  const mockPublicClient = {
    chain: { id: chainId },
    waitForTransactionReceipt: mock(() =>
      Promise.resolve({
        status: "success",
        transactionHash: "0xtxhash",
      })
    ),
    readContract: mock(() => Promise.resolve(undefined)),
  };

  const wagmiState = getWagmiMockState();
  wagmiState.publicClient = mockPublicClient;

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
  const mocks = getMocks();

  if (shouldSucceed) {
    mocks.executeApprovals.mockImplementation(() =>
      Promise.resolve([
        {
          status: "confirmed",
          hash: "0xapprovalhash",
          tokenAddress,
          tokenSymbol,
        },
      ])
    );
  } else {
    mocks.executeApprovals.mockImplementation(() =>
      Promise.reject(new Error("User rejected the request"))
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
  const wagmiState = getWagmiMockState();
  const mockWriteContractAsync = mock(() => Promise.resolve(txHash));

  if (shouldSucceed) {
    mockWriteContractAsync.mockImplementation(() => Promise.resolve(txHash));
  } else {
    mockWriteContractAsync.mockImplementation(() =>
      Promise.reject(new Error("Transaction reverted"))
    );
  }

  wagmiState.writeContract = {
    writeContractAsync: mockWriteContractAsync,
    writeContract: mock(() => {}),
    data: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: mock(() => {}),
  };

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
 * Note: Using valid checksummed Ethereum addresses for viem compatibility
 */
export function createMockToken(overrides?: Partial<SupportedToken>): SupportedToken {
  return {
    address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Valid USDC address on Optimism
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
  const wagmiState = getWagmiMockState();
  const mocks = getMocks();

  // Configure wagmi mock state
  wagmiState.account = {
    address: "0x1234567890123456789012345678901234567890",
    isConnected: true,
    connector: null,
  };
  wagmiState.chainId = 10;

  const mockPublicClient = setupMockPublicClient(10);
  const mockWalletClient = setupMockWalletClient(10);

  const mockWriteContractAsync = mock(() => Promise.resolve("0xtxhash"));
  wagmiState.writeContract = {
    writeContractAsync: mockWriteContractAsync,
    writeContract: mock(() => {}),
    data: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: mock(() => {}),
  };

  // Configure utility mocks
  mocks.checkTokenAllowances.mockImplementation(() => Promise.resolve([]));
  mocks.executeApprovals.mockImplementation(() => Promise.resolve([]));
  mocks.getApprovalAmount.mockImplementation((amount: bigint) => amount);
  mocks.getRPCClient.mockImplementation(() => Promise.resolve(mockPublicClient));
  mocks.getWalletClientWithFallback.mockImplementation(() => Promise.resolve(mockWalletClient));
  mocks.isWalletClientGoodEnough.mockImplementation(() => true);
  mocks.validateChainSync.mockImplementation(() => Promise.resolve(true));

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
  const mocks = getMocks();

  mocks.checkTokenAllowances.mockImplementation(() =>
    Promise.resolve([
      {
        tokenAddress: tokenAddress as Address,
        tokenSymbol,
        requiredAmount,
        currentAllowance: BigInt(0),
        needsApproval: true,
        chainId: 10,
      },
    ])
  );
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
export function createMockSwitchChain(shouldSucceed: boolean = true) {
  const wagmiState = getWagmiMockState();
  const mockSwitchChain = mock(() => Promise.resolve(undefined));

  if (shouldSucceed) {
    mockSwitchChain.mockImplementation(() => Promise.resolve(undefined));
  } else {
    mockSwitchChain.mockImplementation(() =>
      Promise.reject(new Error("User rejected network switch"))
    );
  }

  wagmiState.switchChain = mockSwitchChain;
  return mockSwitchChain;
}

/**
 * Mock fresh wallet client getter
 */
export function createMockGetFreshWalletClient(chainId: number = 10) {
  return mock(() =>
    Promise.resolve({
      chain: { id: chainId },
      account: { address: "0x1234567890123456789012345678901234567890" },
    })
  );
}

/**
 * Clear all donation-related mocks
 */
export function clearDonationMocks() {
  const mocks = getMocks();
  const wagmiState = getWagmiMockState();

  // Reset wagmi state to defaults
  wagmiState.account = {
    address: undefined,
    isConnected: false,
    connector: null,
  };
  wagmiState.chainId = 1;
  wagmiState.walletClient = null;
  wagmiState.publicClient = null;
  wagmiState.writeContract = {
    writeContract: mock(() => {}),
    writeContractAsync: mock(() => Promise.resolve("")),
    data: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: mock(() => {}),
  };
  wagmiState.switchChain = mock(() => Promise.resolve(undefined));

  // Clear mock call history
  if (mocks.checkTokenAllowances?.mockClear) mocks.checkTokenAllowances.mockClear();
  if (mocks.executeApprovals?.mockClear) mocks.executeApprovals.mockClear();
  if (mocks.getApprovalAmount?.mockClear) mocks.getApprovalAmount.mockClear();
  if (mocks.getRPCClient?.mockClear) mocks.getRPCClient.mockClear();
  if (mocks.getWalletClientWithFallback?.mockClear) mocks.getWalletClientWithFallback.mockClear();
  if (mocks.isWalletClientGoodEnough?.mockClear) mocks.isWalletClientGoodEnough.mockClear();
  if (mocks.validateChainSync?.mockClear) mocks.validateChainSync.mockClear();
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
    configurable: true,
  });

  return mockStorage;
}
