/**
 * Mock for utilities/gasless to avoid ESM parsing issues in Jest
 * This mock is used because the gasless utilities import ESM-only packages
 * like @aa-sdk/core and @account-kit/infra that Jest cannot transform.
 *
 * All exports are jest.fn() mocks that can be configured in tests.
 */

// Mock smart account client returned by createGaslessClient
const mockSmartAccountClient = {
  account: { address: "0x1234567890123456789012345678901234567890" },
  getSupportedEntryPoints: jest.fn().mockResolvedValue([]),
  sendUserOperation: jest.fn(),
  waitForUserOperationTransaction: jest.fn(),
};

// Mock ethers signer returned by getGaslessSigner
const mockEthersSigner = {
  getAddress: jest.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
};

// Main API exports - all are jest.fn() for test configurability
export const createGaslessClient = jest.fn().mockResolvedValue(null);
export const getGaslessSigner = jest.fn().mockResolvedValue(null);
export const isChainSupportedForGasless = jest.fn().mockReturnValue(false);
export const createPrivySignerForGasless = jest.fn().mockResolvedValue(null);
export const getChainGaslessConfig = jest.fn().mockReturnValue(null);
export const getProviderForChain = jest.fn().mockReturnValue(null);
export const SUPPORTED_GASLESS_CHAINS: number[] = [];

// Mock for providers submodule (imported via @/utilities/gasless/providers)
export const getProvider = jest.fn((type: string) => ({
  name: type,
  createClient: jest.fn().mockResolvedValue(mockSmartAccountClient),
  toEthersSigner: jest.fn().mockResolvedValue(mockEthersSigner),
}));

export const getRegisteredProviders = jest.fn().mockReturnValue(["zerodev", "alchemy"]);

// Provider classes
export class AlchemyProvider {
  name = "alchemy";
  createClient = jest.fn().mockResolvedValue(mockSmartAccountClient);
  toEthersSigner = jest.fn().mockResolvedValue(mockEthersSigner);
}

export class ZeroDevProvider {
  name = "zerodev";
  createClient = jest.fn().mockResolvedValue(mockSmartAccountClient);
  toEthersSigner = jest.fn().mockResolvedValue(mockEthersSigner);
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
