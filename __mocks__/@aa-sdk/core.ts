/**
 * Mock for @aa-sdk/core to avoid ESM parsing issues in Jest
 */

export const EntryPointAbi_v6 = {};
export const EntryPointAbi_v7 = {};

// Mock commonly used exports
export const createSmartAccountClient = jest.fn();
export const createBundlerClient = jest.fn();
export const createPaymasterClient = jest.fn();
export const WalletClientSigner = jest.fn();
export const LocalAccountSigner = jest.fn();

// Mock types as empty objects
export type SmartAccountClient = any;
export type BundlerClient = any;
export type PaymasterClient = any;
