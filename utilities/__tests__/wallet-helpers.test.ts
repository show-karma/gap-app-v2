import { getWalletClient, reconnect } from "@wagmi/core";
import { safeGetWalletClient } from "../wallet-helpers";

jest.mock("@wagmi/core", () => ({
  getWalletClient: jest.fn(),
  reconnect: jest.fn(),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

jest.mock("../wagmi/privy-config", () => ({
  privyConfig: { _tag: "mock-config" },
}));

const mockGetWalletClient = getWalletClient as jest.Mock;
const mockReconnect = reconnect as jest.Mock;

describe("safeGetWalletClient", () => {
  const mockClient = {
    account: { address: "0x123" },
    chain: { id: 137 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWalletClient.mockResolvedValue(mockClient);
    mockReconnect.mockResolvedValue(undefined);
  });

  it("returns wallet client on success", async () => {
    const result = await safeGetWalletClient(137);

    expect(result.walletClient).toBe(mockClient);
    expect(result.error).toBeNull();
  });

  it("returns error when getWalletClient returns null", async () => {
    mockGetWalletClient.mockResolvedValue(null);

    const result = await safeGetWalletClient(137);

    expect(result.walletClient).toBeNull();
    expect(result.error).toBe("Failed to connect to wallet. Please try again.");
  });

  it("retries when wallet client chain does not match", async () => {
    const staleClient = { account: { address: "0x123" }, chain: { id: 1 } };
    mockGetWalletClient.mockResolvedValueOnce(staleClient).mockResolvedValueOnce(mockClient);

    const result = await safeGetWalletClient(137);

    expect(result.walletClient).toBe(mockClient);
    expect(result.error).toBeNull();
    expect(mockReconnect).toHaveBeenCalled();
  });

  it("returns chain mismatch error after all retries fail", async () => {
    const staleClient = { account: { address: "0x123" }, chain: { id: 1 } };
    mockGetWalletClient.mockResolvedValue(staleClient);

    const result = await safeGetWalletClient(137);

    expect(result.walletClient).toBeNull();
    expect(result.error).toContain("expected 137");
  });

  it("calls setLoadingState(false) on error", async () => {
    mockGetWalletClient.mockResolvedValue(null);
    const setLoadingState = jest.fn();

    await safeGetWalletClient(137, false, setLoadingState);

    expect(setLoadingState).toHaveBeenCalledWith(false);
  });

  it("does not call setLoadingState on success", async () => {
    const setLoadingState = jest.fn();

    await safeGetWalletClient(137, false, setLoadingState);

    expect(setLoadingState).not.toHaveBeenCalled();
  });
});
