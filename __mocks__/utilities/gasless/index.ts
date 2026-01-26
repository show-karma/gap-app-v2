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

// Mock types
export type SmartAccountClient = any;
export type LocalAccountWithEIP7702 = any;
export class GaslessProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GaslessProviderError";
  }
}
