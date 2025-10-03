import { renderHook, act, waitFor } from "@testing-library/react";
import { useCrossChainBalances } from "../useCrossChainBalances";
import type { SupportedToken } from "@/constants/supportedTokens";
import * as wagmi from "wagmi";
import toast from "react-hot-toast";

// Mock dependencies
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
}));

jest.mock("react-hot-toast");

jest.mock("@/hooks/useTokenBalances", () => ({
  useTokenBalances: jest.fn(),
  useMultiChainTokenBalances: jest.fn(),
}));

describe("useCrossChainBalances", () => {
  const mockAddress = "0x1234567890123456789012345678901234567890";

  const mockToken1: SupportedToken = {
    address: "0xUSDC000000000000000000000000000000000000",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false,
  };

  const mockToken2: SupportedToken = {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    chainId: 8453,
    chainName: "Base",
    isNative: true,
  };

  const mockCurrentChainBalances = [
    { token: mockToken1, formattedBalance: "1000" },
  ];

  const mockCrossChainBalances = [
    { token: mockToken1, formattedBalance: "1000" },
    { token: mockToken2, formattedBalance: "5" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });

    const { useTokenBalances, useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");

    useTokenBalances.mockReturnValue({
      tokenBalances: mockCurrentChainBalances,
      isLoading: false,
    });

    useMultiChainTokenBalances.mockReturnValue({
      getAllTokensAcrossChains: jest.fn().mockResolvedValue(mockCrossChainBalances),
    });

    (toast.error as jest.Mock).mockImplementation(() => {});
    (toast.loading as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("initialization", () => {
    it("should initialize with empty balance cache", () => {
      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      expect(result.current.balanceByTokenKey).toEqual({});
      expect(result.current.isFetchingCrossChainBalances).toBe(false);
      expect(result.current.balanceError).toBeNull();
    });
  });

  describe("current chain balance caching", () => {
    it("should cache current chain balances", async () => {
      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.balanceByTokenKey["USDC-10"]).toBe("1000");
      });
    });

    it("should update cache when current chain balances change", async () => {
      const { useTokenBalances } = require("@/hooks/useTokenBalances");

      const { result, rerender } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.balanceByTokenKey["USDC-10"]).toBe("1000");
      });

      // Update balances
      useTokenBalances.mockReturnValue({
        tokenBalances: [
          { token: mockToken1, formattedBalance: "2000" },
        ],
        isLoading: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.balanceByTokenKey["USDC-10"]).toBe("2000");
      });
    });
  });

  describe("cross-chain balance fetching", () => {
    it("should fetch cross-chain balances on mount", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockResolvedValue(mockCrossChainBalances);

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      expect(result.current.isFetchingCrossChainBalances).toBe(true);

      await waitFor(() => {
        expect(result.current.isFetchingCrossChainBalances).toBe(false);
      });

      expect(getAllTokensAcrossChains).toHaveBeenCalled();
    });

    it("should cache cross-chain balances", async () => {
      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.balanceByTokenKey["USDC-10"]).toBe("1000");
        expect(result.current.balanceByTokenKey["ETH-8453"]).toBe("5");
      });
    });

    it("should not fetch when wallet not connected", () => {
      (wagmi.useAccount as jest.Mock).mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockResolvedValue(mockCrossChainBalances);

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      renderHook(() => useCrossChainBalances(10, [10, 8453]));

      expect(getAllTokensAcrossChains).not.toHaveBeenCalled();
    });

    it("should not fetch when no cart chains provided", () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockResolvedValue(mockCrossChainBalances);

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      renderHook(() => useCrossChainBalances(10, []));

      expect(getAllTokensAcrossChains).not.toHaveBeenCalled();
    });
  });

  describe("slow fetch warning", () => {
    it("should set isSlowFetch after 5 seconds", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCrossChainBalances), 10000))
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      expect(result.current.isSlowFetch).toBe(false);

      // Fast-forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.isSlowFetch).toBe(true);
      });
    });

    it("should clear isSlowFetch on successful fetch", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockResolvedValue(mockCrossChainBalances);

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.isSlowFetch).toBe(false);
      });
    });
  });

  describe("timeout handling", () => {
    it("should timeout after 10 seconds", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCrossChainBalances), 15000))
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      // Fast-forward 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(result.current.balanceError).not.toBeNull();
        expect(result.current.balanceError?.message).toContain("timed out");
      });
    });

    it("should show error toast on timeout", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCrossChainBalances), 15000))
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      renderHook(() => useCrossChainBalances(10, [10, 8453]));

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Unable to load all balances"),
          expect.any(Object)
        );
      });
    });
  });

  describe("error handling", () => {
    it("should handle fetch error", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockRejectedValue(
        new Error("Network error")
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.balanceError).not.toBeNull();
        expect(result.current.balanceError?.message).toContain("Network error");
      });
    });

    it("should track failed chains", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockRejectedValue(
        new Error("Network error")
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.failedChains).toEqual([10, 8453]);
      });
    });

    it("should show error toast on fetch error", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockRejectedValue(
        new Error("Network error")
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      renderHook(() => useCrossChainBalances(10, [10, 8453]));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Unable to load all balances"),
          expect.any(Object)
        );
      });
    });

    it("should clear error on successful retry", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      let callCount = 0;
      const getAllTokensAcrossChains = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve(mockCrossChainBalances);
      });

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.balanceError).not.toBeNull();
      });

      // Retry
      await act(async () => {
        await result.current.retryFetchBalances();
      });

      // Fast-forward retry delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.balanceError).toBeNull();
      });
    });
  });

  describe("retry mechanism", () => {
    it("should retry with exponential backoff", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockRejectedValue(
        new Error("Network error")
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.balanceError).not.toBeNull();
      });

      // First retry (1 second delay)
      act(() => {
        result.current.retryFetchBalances();
      });

      expect(toast.loading).toHaveBeenCalledWith(
        expect.stringContaining("1 second"),
        expect.any(Object)
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(getAllTokensAcrossChains).toHaveBeenCalledTimes(2);
      });
    });

    it("should stop retrying after max attempts", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockRejectedValue(
        new Error("Network error")
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.balanceError).not.toBeNull();
      });

      // Attempt multiple retries
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.retryFetchBalances();
        });

        act(() => {
          jest.advanceTimersByTime(5000);
        });
      }

      // Should have stopped retrying
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Maximum retry attempts"),
          expect.any(Object)
        );
      });
    });

    it("should not retry if not retryable", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockRejectedValue(
        new Error("Network error")
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.balanceError).not.toBeNull();
      });

      // Exhaust retry attempts
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.retryFetchBalances();
        });

        act(() => {
          jest.advanceTimersByTime(5000);
        });
      }

      await waitFor(() => {
        expect(result.current.canRetry).toBe(false);
      });
    });
  });

  describe("cleanup", () => {
    it("should clear timeouts on unmount", () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCrossChainBalances), 10000))
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { unmount } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      unmount();

      // No errors should be thrown
      act(() => {
        jest.advanceTimersByTime(15000);
      });
    });

    it("should abort fetch on unmount", () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCrossChainBalances), 10000))
      );

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { unmount } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      unmount();

      // Verify cleanup occurred without errors
      expect(() => {
        act(() => {
          jest.runAllTimers();
        });
      }).not.toThrow();
    });
  });

  describe("successful chains tracking", () => {
    it("should track successful chains", async () => {
      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.successfulChains).toContain(10);
        expect(result.current.successfulChains).toContain(8453);
      });
    });

    it("should not include failed chains in successful chains", async () => {
      const { useMultiChainTokenBalances } = require("@/hooks/useTokenBalances");
      const getAllTokensAcrossChains = jest.fn().mockResolvedValue([
        { token: mockToken1, formattedBalance: "1000" }, // Only chain 10
      ]);

      useMultiChainTokenBalances.mockReturnValue({
        getAllTokensAcrossChains,
      });

      const { result } = renderHook(() =>
        useCrossChainBalances(10, [10, 8453])
      );

      await waitFor(() => {
        expect(result.current.successfulChains).toContain(10);
        expect(result.current.successfulChains).not.toContain(8453);
      });
    });
  });
});
