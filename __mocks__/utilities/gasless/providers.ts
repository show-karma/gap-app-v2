/**
 * Mock for providers submodule
 */

export class AlchemyProvider {
  name = "alchemy";
  createClient = jest.fn().mockResolvedValue({
    account: { address: "0x1234567890123456789012345678901234567890" },
    sendUserOperation: jest.fn(),
    waitForUserOperationTransaction: jest.fn(),
  });
  toEthersSigner = jest.fn().mockResolvedValue({
    getAddress: jest.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
  });
}

export class ZeroDevProvider {
  name = "zerodev";
  createClient = jest.fn().mockResolvedValue({
    account: { address: "0x1234567890123456789012345678901234567890" },
    getSupportedEntryPoints: jest.fn().mockResolvedValue([]),
  });
  toEthersSigner = jest.fn().mockResolvedValue({
    getAddress: jest.fn().mockResolvedValue("0x1234567890123456789012345678901234567890"),
  });
}
