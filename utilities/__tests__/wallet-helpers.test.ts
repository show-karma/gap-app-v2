import { safeGetWalletClient } from "../wallet-helpers";

jest.mock("@wagmi/core", () => ({
  getWalletClient: jest.fn(),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

jest.mock("../wagmi/privy-config", () => ({
  privyConfig: {},
}));

import { getWalletClient } from "@wagmi/core";

const mockGetWalletClient = getWalletClient as jest.MockedFunction<typeof getWalletClient>;

describe("safeGetWalletClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns wallet client on success", async () => {
    const mockClient = { account: { address: "0x123" } } as any;
    mockGetWalletClient.mockResolvedValueOnce(mockClient);

    const result = await safeGetWalletClient(137);

    expect(result.walletClient).toBe(mockClient);
    expect(result.error).toBeNull();
  });

  it("returns error when getWalletClient throws", async () => {
    mockGetWalletClient.mockRejectedValueOnce(new Error("Connector not connected"));

    const result = await safeGetWalletClient(137);

    expect(result.walletClient).toBeNull();
    expect(result.error).toBe("Failed to connect to wallet. Please try again.");
  });

  it("returns error when getWalletClient returns null", async () => {
    mockGetWalletClient.mockResolvedValueOnce(null as any);

    const result = await safeGetWalletClient(137);

    expect(result.walletClient).toBeNull();
    expect(result.error).toBe("Failed to connect to wallet. Please try again.");
  });

  it("calls setLoadingState(false) on failure", async () => {
    const setLoadingState = jest.fn();
    mockGetWalletClient.mockRejectedValueOnce(new Error("Failed"));

    await safeGetWalletClient(137, false, setLoadingState);

    expect(setLoadingState).toHaveBeenCalledWith(false);
  });

  it("does not call setLoadingState on success", async () => {
    const setLoadingState = jest.fn();
    const mockClient = { account: { address: "0x123" } } as any;
    mockGetWalletClient.mockResolvedValueOnce(mockClient);

    await safeGetWalletClient(137, false, setLoadingState);

    expect(setLoadingState).not.toHaveBeenCalled();
  });
});
