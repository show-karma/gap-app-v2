/**
 * Mock for @account-kit/infra to avoid ESM parsing issues
 */

export const simulateUserOperationChanges = jest.fn();
export const createAlchemySmartAccountClient = jest.fn(() => ({
  sendUserOperation: jest.fn(),
  waitForUserOperationTransaction: jest.fn(),
}));
export const alchemy = jest.fn();
