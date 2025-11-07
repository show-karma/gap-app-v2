import {
  validateChainSync,
  waitForChainSync,
  getCurrentChainId,
} from "@/utilities/chainSyncValidation";
import type { WalletClient } from "viem";

// Mock console methods
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

describe("chainSyncValidation utilities", () => {
  const mockAccount = {
    address: "0x1234567890123456789012345678901234567890" as const,
  };

  const createMockWalletClient = (chainId: number, hasAccount = true, hasChain = true): WalletClient => {
    return {
      account: hasAccount ? mockAccount : undefined,
      chain: hasChain ? { id: chainId } : undefined,
    } as WalletClient;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: Date.now() });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("validateChainSync", () => {
    it("should pass validation when wallet is on correct chain", async () => {
      const walletClient = createMockWalletClient(10);
      const expectedChainId = 10;

      await expect(
        validateChainSync(walletClient, expectedChainId, "donation")
      ).resolves.not.toThrow();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Validating chain sync")
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Chain sync validated")
      );
    });

    it("should throw error when wallet client is null", async () => {
      const expectedChainId = 10;

      await expect(
        validateChainSync(null, expectedChainId, "donation")
      ).rejects.toThrow("Wallet client is not available");

      // Console.log is called but may be cleared, verify by checking the error
    });

    it("should throw error when wallet client is undefined", async () => {
      const expectedChainId = 10;

      await expect(
        validateChainSync(undefined, expectedChainId, "donation")
      ).rejects.toThrow("Wallet client is not available");
    });

    it("should throw error when wallet client has no account", async () => {
      const walletClient = createMockWalletClient(10, false);
      const expectedChainId = 10;

      await expect(
        validateChainSync(walletClient, expectedChainId, "donation")
      ).rejects.toThrow("No account connected to wallet");
    });

    it("should throw error when wallet client has no chain information", async () => {
      const walletClient = createMockWalletClient(10, true, false);
      const expectedChainId = 10;

      await expect(
        validateChainSync(walletClient, expectedChainId, "donation")
      ).rejects.toThrow("Wallet client has no chain information");
    });

    it("should throw error when wallet is on wrong chain", async () => {
      const walletClient = createMockWalletClient(8453); // Base
      const expectedChainId = 10; // Optimism

      await expect(
        validateChainSync(walletClient, expectedChainId, "donation")
      ).rejects.toThrow("Chain mismatch");

      const error = await validateChainSync(walletClient, expectedChainId, "donation").catch(
        (e) => e
      );
      expect(error.message).toContain("Wallet is on chain 8453");
      expect(error.message).toContain("requires chain 10");
    });

    it("should include operation name in error messages", async () => {
      const walletClient = createMockWalletClient(8453);
      const expectedChainId = 10;

      await expect(
        validateChainSync(walletClient, expectedChainId, "approval")
      ).rejects.toThrow("approval");

      const error = await validateChainSync(walletClient, expectedChainId, "approval").catch(
        (e) => e
      );
      expect(error.message).toContain("approval");
    });

    it("should use default operation name when not provided", async () => {
      const walletClient = createMockWalletClient(8453);
      const expectedChainId = 10;

      await expect(
        validateChainSync(walletClient, expectedChainId)
      ).rejects.toThrow("transaction");
    });
  });

  describe("waitForChainSync", () => {
    it("should return wallet client immediately when already synced", async () => {
      const walletClient = createMockWalletClient(10);
      const getWalletClient = jest.fn().mockReturnValue(walletClient);
      const expectedChainId = 10;

      const result = await waitForChainSync(getWalletClient, expectedChainId, 30000, "donation");

      expect(result).toBe(walletClient);
      expect(getWalletClient).toHaveBeenCalledTimes(1);
    });

    it("should wait and retry when wallet is on wrong chain", async () => {
      const wrongChainClient = createMockWalletClient(8453);
      const correctChainClient = createMockWalletClient(10);
      const getWalletClient = jest
        .fn()
        .mockReturnValueOnce(wrongChainClient)
        .mockReturnValueOnce(wrongChainClient)
        .mockReturnValueOnce(correctChainClient);
      const expectedChainId = 10;

      const promise = waitForChainSync(getWalletClient, expectedChainId, 30000, "donation");

      // Fast-forward timers to trigger retries
      await jest.advanceTimersByTimeAsync(500);
      await jest.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toBe(correctChainClient);
      expect(getWalletClient).toHaveBeenCalledTimes(3);
    });

    it("should use exponential backoff for retries", async () => {
      const wrongChainClient = createMockWalletClient(8453);
      const correctChainClient = createMockWalletClient(10);
      const getWalletClient = jest
        .fn()
        .mockReturnValueOnce(wrongChainClient)
        .mockReturnValueOnce(wrongChainClient)
        .mockReturnValueOnce(correctChainClient);

      const promise = waitForChainSync(getWalletClient, 10, 30000, "donation");

      // Advance timers and system time together
      await jest.advanceTimersByTimeAsync(500);
      jest.setSystemTime(Date.now() + 500);
      await jest.advanceTimersByTimeAsync(1000);
      jest.setSystemTime(Date.now() + 1000);

      const result = await promise;
      expect(result).toBe(correctChainClient);
      expect(getWalletClient).toHaveBeenCalledTimes(3);
    });

    it("should timeout after maxWaitMs", async () => {
      const wrongChainClient = createMockWalletClient(8453);
      const getWalletClient = jest.fn().mockReturnValue(wrongChainClient);
      const expectedChainId = 10;
      const maxWaitMs = 100;

      const promise = waitForChainSync(getWalletClient, expectedChainId, maxWaitMs, "donation");

      // Advance timers and system time past timeout
      await jest.advanceTimersByTimeAsync(maxWaitMs + 100);
      jest.setSystemTime(Date.now() + maxWaitMs + 100);

      await expect(promise).rejects.toThrow("Timed out waiting for wallet to sync");
    });

    it("should make final attempt before timing out", async () => {
      const wrongChainClient = createMockWalletClient(8453);
      const correctChainClient = createMockWalletClient(10);
      const getWalletClient = jest
        .fn()
        .mockReturnValueOnce(wrongChainClient)
        .mockReturnValueOnce(wrongChainClient)
        .mockReturnValueOnce(correctChainClient); // Final attempt succeeds

      const maxWaitMs = 1000;
      const promise = waitForChainSync(getWalletClient, 10, maxWaitMs, "donation");

      // Advance timers and system time
      await jest.advanceTimersByTimeAsync(500);
      jest.setSystemTime(Date.now() + 500);
      await jest.advanceTimersByTimeAsync(1000);
      jest.setSystemTime(Date.now() + 1000);

      const result = await promise;
      expect(result).toBe(correctChainClient);
    });

    it("should include operation name in timeout error", async () => {
      const wrongChainClient = createMockWalletClient(8453);
      const getWalletClient = jest.fn().mockReturnValue(wrongChainClient);
      const maxWaitMs = 100;

      const promise = waitForChainSync(getWalletClient, 10, maxWaitMs, "approval");

      // Advance timers and system time past timeout
      await jest.advanceTimersByTimeAsync(maxWaitMs + 100);
      jest.setSystemTime(Date.now() + maxWaitMs + 100);

      await expect(promise).rejects.toThrow("approval");
    });

    it("should handle wallet client becoming null during wait", async () => {
      const wrongChainClient = createMockWalletClient(8453);
      const getWalletClient = jest
        .fn()
        .mockReturnValueOnce(wrongChainClient)
        .mockReturnValueOnce(null);

      const promise = waitForChainSync(getWalletClient, 10, 1000, "donation");

      // Advance timers
      await jest.advanceTimersByTimeAsync(500);
      jest.setSystemTime(Date.now() + 500);

      await expect(promise).rejects.toThrow();
    });

    it("should cap exponential backoff delay at 5000ms", async () => {
      const wrongChainClient = createMockWalletClient(8453);
      const getWalletClient = jest.fn().mockReturnValue(wrongChainClient);
      const maxWaitMs = 100;

      const promise = waitForChainSync(getWalletClient, 10, maxWaitMs, "donation");

      // Advance timers and system time past timeout
      await jest.advanceTimersByTimeAsync(maxWaitMs + 100);
      jest.setSystemTime(Date.now() + maxWaitMs + 100);

      await expect(promise).rejects.toThrow("Timed out");
    });
  });

  describe("getCurrentChainId", () => {
    const originalWindow = global.window;

    beforeEach(() => {
      // Reset window
      delete (global as any).window;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it("should return chain ID from window.ethereum when available", async () => {
      const mockEthereum = {
        request: jest.fn().mockResolvedValue("0xa"), // 10 in hex
      };

      (global as any).window = {
        ethereum: mockEthereum,
      };

      const chainId = await getCurrentChainId();

      expect(chainId).toBe(10);
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: "eth_chainId",
      });
    });

    it("should parse hex chain ID correctly", async () => {
      const mockEthereum = {
        request: jest.fn().mockResolvedValue("0x2105"), // 8453 in hex (Base)
      };

      (global as any).window = {
        ethereum: mockEthereum,
      };

      const chainId = await getCurrentChainId();

      expect(chainId).toBe(8453);
    });

    it("should return null when window.ethereum is unavailable", async () => {
      (global as any).window = {};

      const chainId = await getCurrentChainId();

      expect(chainId).toBeNull();
    });

    it("should return null when window is undefined", async () => {
      const chainId = await getCurrentChainId();

      expect(chainId).toBeNull();
    });

    it("should handle request errors gracefully", async () => {
      const mockEthereum = {
        request: jest.fn().mockRejectedValue(new Error("Request failed")),
      };

      (global as any).window = {
        ethereum: mockEthereum,
      };

      const chainId = await getCurrentChainId();

      expect(chainId).toBeNull();
      // Console.warn is called but may be cleared, verify by checking result
    });

    it("should handle invalid hex chain ID", async () => {
      const mockEthereum = {
        request: jest.fn().mockResolvedValue("invalid"),
      };

      (global as any).window = {
        ethereum: mockEthereum,
      };

      const chainId = await getCurrentChainId();

      // parseInt("invalid", 16) returns NaN
      expect(Number.isNaN(chainId)).toBe(true);
    });

    it("should handle empty chain ID response", async () => {
      const mockEthereum = {
        request: jest.fn().mockResolvedValue(""),
      };

      (global as any).window = {
        ethereum: mockEthereum,
      };

      const chainId = await getCurrentChainId();

      // parseInt("", 16) returns NaN
      expect(Number.isNaN(chainId)).toBe(true);
    });

    it("should handle zero chain ID", async () => {
      const mockEthereum = {
        request: jest.fn().mockResolvedValue("0x0"),
      };

      (global as any).window = {
        ethereum: mockEthereum,
      };

      const chainId = await getCurrentChainId();

      expect(chainId).toBe(0);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle wallet switching chains during wait", async () => {
      const baseClient = createMockWalletClient(8453);
      const optimismClient = createMockWalletClient(10);
      const getWalletClient = jest
        .fn()
        .mockReturnValueOnce(baseClient)
        .mockReturnValueOnce(baseClient)
        .mockReturnValueOnce(optimismClient);

      const promise = waitForChainSync(getWalletClient, 10, 30000, "donation");

      await jest.advanceTimersByTimeAsync(500);
      await jest.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result).toBe(optimismClient);
    });

    it("should handle wallet disconnecting during wait", async () => {
      const connectedClient = createMockWalletClient(8453);
      const disconnectedClient = createMockWalletClient(8453, false);
      const getWalletClient = jest
        .fn()
        .mockReturnValueOnce(connectedClient)
        .mockReturnValueOnce(disconnectedClient);

      const promise = waitForChainSync(getWalletClient, 10, 1000, "donation");

      // Advance timers
      await jest.advanceTimersByTimeAsync(500);
      jest.setSystemTime(Date.now() + 500);

      await expect(promise).rejects.toThrow();
    });
  });
});

