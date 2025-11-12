/**
 * Centralized Mock Data
 *
 * This file contains reusable mock data for tests to ensure consistency
 * and reduce duplication across test files.
 */

import type { SupportedToken } from "@/constants/supportedTokens";

/**
 * Mock Addresses
 */
export const MOCK_ADDRESSES = {
  VALID_WALLET: "0x1234567890123456789012345678901234567890",
  VALID_WALLET_2: "0x0987654321098765432109876543210987654321",
  INVALID: "invalid-address",
  ZERO: "0x0000000000000000000000000000000000000000",
} as const;

/**
 * Mock Tokens
 */
export const MOCK_TOKENS: Record<string, SupportedToken> = {
  USDC_OPTIMISM: {
    address: "0xUSDC000000000000000000000000000000000000",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false,
  },
  ETH_BASE: {
    address: "native",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    chainId: 8453,
    chainName: "Base",
    isNative: true,
  },
  USDC_BASE: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 8453,
    chainName: "Base",
    isNative: false,
  },
  ETH_OPTIMISM: {
    address: "native",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    chainId: 10,
    chainName: "Optimism",
    isNative: true,
  },
} as const;

/**
 * Mock Cart Items
 */
export const MOCK_CART_ITEMS = {
  PROJECT_1: {
    uid: "project-1",
    title: "Test Project 1",
    slug: "test-project-1",
    imageURL: "https://example.com/image1.png",
  },
  PROJECT_2: {
    uid: "project-2",
    title: "Test Project 2",
    slug: "test-project-2",
    imageURL: "https://example.com/image2.png",
  },
  PROJECT_WITHOUT_IMAGE: {
    uid: "project-3",
    title: "Test Project 3",
    slug: "test-project-3",
  },
} as const;

/**
 * Mock BigInt Values
 */
export const MOCK_BIGINT = {
  ONE_ETH: BigInt("1000000000000000000"), // 1 ETH in wei
  FIVE_ETH: BigInt("5000000000000000000"), // 5 ETH in wei
  HUNDRED_USDC: BigInt("100000000"), // 100 USDC with 6 decimals
  THOUSAND_USDC: BigInt("1000000000"), // 1000 USDC with 6 decimals
  ZERO: BigInt("0"),
} as const;

/**
 * Mock Error Messages
 */
export const MOCK_ERRORS = {
  NETWORK: new Error("Network Error"),
  TIMEOUT: new Error("Request Timeout"),
  USER_REJECTED: new Error("User rejected the transaction"),
  INSUFFICIENT_BALANCE: new Error("Insufficient balance"),
  RPC_ERROR: new Error("RPC error"),
} as const;

/**
 * Mock API Responses
 */
export const MOCK_API_RESPONSES = {
  SUCCESS: {
    data: { result: "success" },
    status: 200,
  },
  ERROR_BAD_REQUEST: {
    response: {
      data: {
        message: "Bad Request",
      },
      status: 400,
    },
  },
  ERROR_UNAUTHORIZED: {
    response: {
      data: {
        message: "Unauthorized",
      },
      status: 401,
    },
  },
  ERROR_NOT_FOUND: {
    response: {
      data: {
        message: "Not Found",
      },
      status: 404,
    },
  },
} as const;

/**
 * Mock Transaction Hashes
 */
export const MOCK_TX_HASHES = {
  SUCCESS: "0xabc123def456789012345678901234567890abcdef0123456789012345678901",
  PENDING: "0x123abc456def789012345678901234567890abcdef0123456789012345678902",
  FAILED: "0x999999999999999999999999999999999999999999999999999999999999999",
} as const;

/**
 * Mock Chain IDs
 */
export const MOCK_CHAIN_IDS = {
  ETHEREUM: 1,
  OPTIMISM: 10,
  BASE: 8453,
  ARBITRUM: 42161,
  POLYGON: 137,
  UNSUPPORTED: 99999,
} as const;

/**
 * Helper to create mock project data
 */
export function createMockProject(overrides: Record<string, any> = {}) {
  return {
    uid: "test-project-uid",
    title: "Test Project",
    slug: "test-project",
    description: "A test project",
    payoutAddress: MOCK_ADDRESSES.VALID_WALLET,
    imageURL: "https://example.com/project.png",
    ...overrides,
  };
}

/**
 * Helper to create mock payment data
 */
export function createMockPayment(overrides: Record<string, any> = {}) {
  return {
    projectId: MOCK_CART_ITEMS.PROJECT_1.uid,
    amount: "100",
    token: MOCK_TOKENS.USDC_OPTIMISM,
    chainId: MOCK_CHAIN_IDS.OPTIMISM,
    ...overrides,
  };
}
