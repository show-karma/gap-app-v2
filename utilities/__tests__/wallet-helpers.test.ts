import { safeGetWalletClient } from "../wallet-helpers";

vi.mock("@wagmi/core", () => {
  class MockConnectorNotConnectedError extends Error {
    constructor() {
      super("Connector not connected.");
      this.name = "ConnectorNotConnectedError";
    }
  }
  return {
    getWalletClient: vi.fn(),
    reconnect: vi.fn(),
    getAccount: vi.fn(),
    ConnectorNotConnectedError: MockConnectorNotConnectedError,
  };
});

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("../wagmi/privy-config", () => ({
  privyConfig: {},
}));

import { ConnectorNotConnectedError, getAccount, getWalletClient, reconnect } from "@wagmi/core";
import { errorManager } from "@/components/Utilities/errorManager";

const mockGetWalletClient = getWalletClient as vi.MockedFunction<typeof getWalletClient>;
const mockReconnect = reconnect as vi.MockedFunction<typeof reconnect>;
const mockGetAccount = getAccount as vi.MockedFunction<typeof getAccount>;
const mockErrorManager = errorManager as vi.MockedFunction<typeof errorManager>;

const connectedAccount = { status: "connected" } as any;
const disconnectedAccount = { status: "disconnected" } as any;

describe("safeGetWalletClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockReconnect.mockResolvedValue([]);
    // Default: connector is connected (no startup race).
    mockGetAccount.mockReturnValue(connectedAccount);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("success", () => {
    it("returns wallet client on success", async () => {
      const mockClient = {
        account: { address: "0x123" },
        chain: { id: 137 },
      } as any;
      mockGetWalletClient.mockResolvedValueOnce(mockClient);

      const result = await safeGetWalletClient(137);

      expect(result.walletClient).toBe(mockClient);
      expect(result.error).toBeNull();
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("does not call setLoadingState on success", async () => {
      const setLoadingState = vi.fn();
      const mockClient = {
        account: { address: "0x123" },
        chain: { id: 137 },
      } as any;
      mockGetWalletClient.mockResolvedValueOnce(mockClient);

      await safeGetWalletClient(137, false, setLoadingState);

      expect(setLoadingState).not.toHaveBeenCalled();
    });
  });

  describe("connector startup race (transient, not reported)", () => {
    it("reconnects and acquires the client when the connector connects after a poll", async () => {
      // Disconnected at first, then connected after reconnect/poll.
      mockGetAccount
        .mockReturnValueOnce(disconnectedAccount) // initial guard check
        .mockReturnValue(connectedAccount); // after reconnect
      const mockClient = { chain: { id: 137 } } as any;
      mockGetWalletClient.mockResolvedValueOnce(mockClient);

      const promise = safeGetWalletClient(137);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockReconnect).toHaveBeenCalled();
      expect(result.walletClient).toBe(mockClient);
      expect(result.error).toBeNull();
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("returns a typed not-connected result without reporting when the connector never connects", async () => {
      mockGetAccount.mockReturnValue(disconnectedAccount);

      const promise = safeGetWalletClient(137);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.walletClient).toBeNull();
      expect(result.error).toBe("Failed to connect to wallet. Please try again.");
      expect(mockGetWalletClient).not.toHaveBeenCalled();
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("does not report ConnectorNotConnectedError thrown by getWalletClient after the guard passes", async () => {
      mockGetWalletClient.mockRejectedValueOnce(new (ConnectorNotConnectedError as any)());

      const promise = safeGetWalletClient(137);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.walletClient).toBeNull();
      expect(result.error).toBe("Failed to connect to wallet. Please try again.");
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("calls setLoadingState(false) when the connector never connects", async () => {
      const setLoadingState = vi.fn();
      mockGetAccount.mockReturnValue(disconnectedAccount);

      const promise = safeGetWalletClient(137, false, setLoadingState);
      await vi.runAllTimersAsync();
      await promise;

      expect(setLoadingState).toHaveBeenCalledWith(false);
    });
  });

  describe("genuine failures (reported)", () => {
    it("reports when getWalletClient returns null", async () => {
      mockGetWalletClient.mockResolvedValueOnce(null as any);

      const result = await safeGetWalletClient(137);

      expect(result.walletClient).toBeNull();
      expect(result.error).toBe("Failed to connect to wallet. Please try again.");
      expect(mockErrorManager).toHaveBeenCalledWith("Wallet client error", expect.any(Error), {
        chainId: 137,
      });
    });

    it("reports a genuine provider error and calls setLoadingState", async () => {
      const setLoadingState = vi.fn();
      mockGetWalletClient.mockRejectedValueOnce(new Error("Provider exploded"));

      const promise = safeGetWalletClient(137, false, setLoadingState);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.walletClient).toBeNull();
      expect(result.error).toBe("Failed to connect to wallet. Please try again.");
      expect(setLoadingState).toHaveBeenCalledWith(false);
      expect(mockErrorManager).toHaveBeenCalledWith("Wallet client error", expect.any(Error), {
        chainId: 137,
      });
    });

    it("reports and surfaces the wrong-chain error after reconnect fails to fix it", async () => {
      const wrongChainClient = { chain: { id: 1 } } as any;
      mockGetWalletClient.mockResolvedValue(wrongChainClient);

      const promise = safeGetWalletClient(137);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.walletClient).toBeNull();
      expect(result.error).toContain("expected 137");
      expect(mockErrorManager).toHaveBeenCalled();
    });
  });
});
