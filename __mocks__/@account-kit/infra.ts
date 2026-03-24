import { vi } from "vitest";
/**
 * Mock for @account-kit/infra to avoid ESM parsing issues
 */

export const simulateUserOperationChanges = vi.fn();
export const createAlchemySmartAccountClient = vi.fn(() => ({
  sendUserOperation: vi.fn(),
  waitForUserOperationTransaction: vi.fn(),
}));
export const alchemy = vi.fn();
