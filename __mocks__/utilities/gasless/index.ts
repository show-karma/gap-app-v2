/**
 * Mock for utilities/gasless to avoid ESM parsing issues in Jest
 * This mock is used because the gasless utilities import ESM-only packages
 * like @aa-sdk/core and @account-kit/infra that Jest cannot transform.
 */

export const createGaslessClient = jest.fn().mockResolvedValue(null);
export const getGaslessSigner = jest.fn().mockResolvedValue(null);
export const isChainSupportedForGasless = jest.fn().mockReturnValue(false);
export const createPrivySignerForGasless = jest.fn().mockResolvedValue(null);
export const getChainGaslessConfig = jest.fn().mockReturnValue(null);
export const getProviderForChain = jest.fn().mockReturnValue(null);
export const SUPPORTED_GASLESS_CHAINS = [];

// Mock for providers submodule (imported via @/utilities/gasless/providers)
export const getProvider = jest.fn((type: string) => ({
  name: type,
  createClient: jest.fn().mockResolvedValue({
    account: { address: "0x1234567890123456789012345678901234567890" },
    getSupportedEntryPoints: jest.fn().mockResolvedValue([]),
    sendUserOperation: jest.fn(),
    waitForUserOperationTransaction: jest.fn(),
  }),
  toEthersSigner: jest.fn().mockResolvedValue({
    getAddress: jest.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
  }),
}));
export const getRegisteredProviders = jest.fn().mockReturnValue(["zerodev", "alchemy"]);
export { AlchemyProvider, ZeroDevProvider } from "./providers";

// Mock types
export type SmartAccountClient = any;
export type LocalAccountWithEIP7702 = any;
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
  }
}
