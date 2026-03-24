import { vi } from "vitest";
/**
 * Mock for @account-kit/smart-contracts to avoid ESM parsing issues
 */

export const createLightAccount = vi.fn();
export const createModularAccountV2Client = vi.fn(() => ({
  sendUserOperation: vi.fn(),
  waitForUserOperationTransaction: vi.fn(),
}));
export const createModularAccountAlchemyClient = vi.fn();
