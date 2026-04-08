import { vi } from "vitest";

/**
 * Creates a mock viem WalletClient for testing transaction-related code.
 */
export function createMockWalletClient(
  options: {
    address?: `0x${string}`;
    writeContractResult?: `0x${string}`;
    writeContractError?: Error;
    signTypedDataResult?: `0x${string}`;
    signTypedDataError?: Error;
  } = {}
) {
  const address: `0x${string}` = options.address ?? "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  return {
    account: { address },
    chain: { id: 10, name: "OP Mainnet" },
    writeContract: options.writeContractError
      ? vi.fn().mockRejectedValue(options.writeContractError)
      : vi.fn().mockResolvedValue(options.writeContractResult ?? (`0x${"a".repeat(64)}` as const)),
    signTypedData: options.signTypedDataError
      ? vi.fn().mockRejectedValue(options.signTypedDataError)
      : vi.fn().mockResolvedValue(options.signTypedDataResult ?? (`0x${"b".repeat(130)}` as const)),
    signMessage: vi.fn().mockResolvedValue(`0x${"c".repeat(130)}` as const),
  };
}

/**
 * Creates a mock viem PublicClient for testing read-only chain interactions.
 */
export function createMockPublicClient(
  options: {
    receiptStatus?: "success" | "reverted";
    receiptError?: Error;
    readContractResults?: Record<string, unknown>;
  } = {}
) {
  return {
    waitForTransactionReceipt: options.receiptError
      ? vi.fn().mockRejectedValue(options.receiptError)
      : vi.fn().mockResolvedValue({
          status: options.receiptStatus ?? "success",
        }),
    readContract: vi
      .fn()
      .mockImplementation(({ functionName }: { functionName: string }) =>
        Promise.resolve(options.readContractResults?.[functionName] ?? 0n)
      ),
    getBalance: vi.fn().mockResolvedValue(1000000000000000000n),
    getBytecode: vi.fn().mockResolvedValue("0x6080"),
  };
}
