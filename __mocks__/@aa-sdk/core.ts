import { vi } from "vitest";
/**
 * Mock for @aa-sdk/core to avoid ESM parsing issues in Jest
 */

export const EntryPointAbi_v6 = {};
export const EntryPointAbi_v7 = {};

// Mock commonly used exports
export const createSmartAccountClient = vi.fn();
export const createBundlerClient = vi.fn();
export const createPaymasterClient = vi.fn();
export const WalletClientSigner = vi.fn();
export const LocalAccountSigner = vi.fn();

// Mock types as empty objects
export type SmartAccountClient = any;
export type BundlerClient = any;
export type PaymasterClient = any;
