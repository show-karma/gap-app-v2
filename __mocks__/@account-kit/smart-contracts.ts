/**
 * Mock for @account-kit/smart-contracts to avoid ESM parsing issues
 */

export const createLightAccount = jest.fn();
export const createModularAccountV2Client = jest.fn(() => ({
  sendUserOperation: jest.fn(),
  waitForUserOperationTransaction: jest.fn(),
}));
export const createModularAccountAlchemyClient = jest.fn();
