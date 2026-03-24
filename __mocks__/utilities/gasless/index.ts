import { vi } from "vitest";

/**
 * Mock for utilities/gasless to avoid ESM parsing issues in Jest
 * This mock is used because the gasless utilities import ESM-only packages
 * like @aa-sdk/core and @account-kit/infra that Jest cannot transform.
 *
 * All exports are vi.fn() mocks that can be configured in tests.
 */

// Mock smart account client returned by createGaslessClient
const mockSmartAccountClient = {
  account: { address: "0x1234567890123456789012345678901234567890" },
  getSupportedEntryPoints: vi.fn().mockResolvedValue([]),
  sendUserOperation: vi.fn(),
  waitForUserOperationTransaction: vi.fn(),
};

// Mock ethers signer returned by getGaslessSigner
const mockEthersSigner = {
  getAddress: vi.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
};

// Main API exports - all are vi.fn() for test configurability
export const createGaslessClient = vi.fn().mockResolvedValue(null);
export const getGaslessSigner = vi.fn().mockResolvedValue(null);
export const isChainSupportedForGasless = vi.fn().mockReturnValue(false);
export const createPrivySignerForGasless = vi.fn().mockResolvedValue(null);
export const getChainGaslessConfig = vi.fn().mockReturnValue(null);
export const getProviderForChain = vi.fn().mockReturnValue(null);
export const SUPPORTED_GASLESS_CHAINS: number[] = [];

// Mock for providers submodule (imported via @/utilities/gasless/providers)
export const getProvider = vi.fn((type: string) => ({
  name: type,
  createClient: vi.fn().mockResolvedValue(mockSmartAccountClient),
  toEthersSigner: vi.fn().mockResolvedValue(mockEthersSigner),
}));

export const getRegisteredProviders = vi.fn().mockReturnValue(["zerodev", "alchemy"]);

// Provider classes
export class AlchemyProvider {
  name = "alchemy";
  createClient = vi.fn().mockResolvedValue(mockSmartAccountClient);
  toEthersSigner = vi.fn().mockResolvedValue(mockEthersSigner);
}

export class ZeroDevProvider {
  name = "zerodev";
  createClient = vi.fn().mockResolvedValue(mockSmartAccountClient);
  toEthersSigner = vi.fn().mockResolvedValue(mockEthersSigner);
}

// Mock types
export type SmartAccountClient = typeof mockSmartAccountClient;
export type LocalAccountWithEIP7702 = {
  address: `0x${string}`;
  type: "local";
  signMessage: (args: { message: string }) => Promise<`0x${string}`>;
  signTypedData: (args: any) => Promise<`0x${string}`>;
  signAuthorization?: (args: any) => Promise<any>;
};

export type ChainGaslessConfig = {
  rpcUrl?: string;
  paymasterUrl?: string;
  bundlerUrl?: string;
};

export type GaslessProviderType = "zerodev" | "alchemy";

export interface IGaslessProvider {
  name: string;
  createClient: (args: any) => Promise<SmartAccountClient>;
  toEthersSigner: (client: any, chainId: number, config: any) => Promise<any>;
}

// Error class
export class GaslessProviderError extends Error {
  provider?: string;
  chainId?: number;
  originalError?: Error;

  constructor(message: string, provider?: string, chainId?: number, originalError?: Error) {
    super(message);
    this.name = "GaslessProviderError";
    this.provider = provider;
    this.chainId = chainId;
    this.originalError = originalError;
    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GaslessProviderError);
    }
  }
}
