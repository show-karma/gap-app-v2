/**
 * @file Tests for useCrossChainBalances hook
 * @description Tests for cross-chain balance fetching hook covering multi-chain balance retrieval and caching
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import * as wagmi from "wagmi";
import type { SupportedToken } from "@/constants/supportedTokens";
import { useCrossChainBalances } from "@/hooks/donation/useCrossChainBalances";

// Mock dependencies
vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
}));

vi.mock("@/utilities/rpcClient", () => ({
  getRPCClient: vi.fn(),
}));

vi.mock("@/constants/supportedTokens", () => ({
  ...vi.importActual("@/constants/supportedTokens"),
  getTokensByChain: vi.fn(),
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
    address: "native",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    chainId: 8453,
    chainName: "Base",
    isNative: true,
  };

  let queryClient: QueryClient;

  const createWrapper = (options?: { disableRetry?: boolean }) => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: options?.disableRetry ? false : 2,
          retryDelay: 100, // Fast retries in tests
          gcTime: 0,
        },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    Wrapper.displayName = "QueryClientWrapper";

    return Wrapper;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    (wagmi.useAccount as vi.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });

    const { getRPCClient } = (await import("@/utilities/rpcClient")) as unknown as {
      getRPCClient: vi.Mock;
    };
    const { getTokensByChain } = (await import("@/constants/supportedTokens")) as unknown as {
      getTokensByChain: vi.Mock;
    };

    // Mock getTokensByChain
    getTokensByChain.mockImplementation((chainId: number) => {
      if (chainId === 10) return [mockToken1];
      if (chainId === 8453) return [mockToken2];
      return [];
    });

    // Mock RPC client
    getRPCClient.mockImplementation((_chainId: number) => {
      const mockClient = {
        getBalance: vi.fn().mockResolvedValue(BigInt("5000000000000000000")), // 5 ETH
        multicall: vi.fn().mockResolvedValue([
          { status: "success", result: BigInt("1000000000") }, // 1000 USDC
        ]),
      };
      return Promise.resolve(mockClient);
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("initialization", () => {
    it("should not fetch when wallet not connected", () => {
      (wagmi.useAccount as vi.Mock).mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { result } = renderHook(() => useCrossChainBalances(10, [10, 8453]), {
        wrapper: createWrapper(),
      });

      expect(result.current.balanceByTokenKey).toEqual({});
      expect(result.current.isFetchingCrossChainBalances).toBe(false);
    });

    it("should not fetch when no chains provided", () => {
      const { result } = renderHook(() => useCrossChainBalances(10, []), {
        wrapper: createWrapper(),
      });

      expect(result.current.balanceByTokenKey).toEqual({});
      expect(result.current.isFetchingCrossChainBalances).toBe(false);
    });
  });

  describe("balance fetching", () => {
    it("should fetch balances from multiple chains", async () => {
      const { result } = renderHook(() => useCrossChainBalances(10, [10, 8453]), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetchingCrossChainBalances).toBe(false);
      });

      expect(result.current.balanceByTokenKey["USDC-10"]).toBeDefined();
      expect(result.current.balanceByTokenKey["ETH-8453"]).toBeDefined();
    });

    it("should use react-query caching", async () => {
      const { getRPCClient } = (await import("@/utilities/rpcClient")) as unknown as {
        getRPCClient: vi.Mock;
      };

      const { rerender } = renderHook(() => useCrossChainBalances(10, [10, 8453]), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getRPCClient).toHaveBeenCalled();
      });

      const firstCallCount = (getRPCClient as vi.Mock).mock.calls.length;

      // Rerender should use cache
      rerender();

      // Should not call again due to caching
      expect((getRPCClient as vi.Mock).mock.calls.length).toBe(firstCallCount);
    });

    it("should handle native token balances", async () => {
      const { result } = renderHook(() => useCrossChainBalances(8453, [8453]), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetchingCrossChainBalances).toBe(false);
      });

      // formatUnits from viem returns "5" not "5.0"
      expect(result.current.balanceByTokenKey["ETH-8453"]).toBe("5");
    });

    it("should handle ERC20 token balances", async () => {
      const { result } = renderHook(() => useCrossChainBalances(10, [10]), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetchingCrossChainBalances).toBe(false);
      });

      // formatUnits from viem returns "1000" not "1000.0"
      expect(result.current.balanceByTokenKey["USDC-10"]).toBe("1000");
    });
  });

  describe("error handling", () => {
    it("should handle multicall failures", async () => {
      const { getRPCClient } = (await import("@/utilities/rpcClient")) as unknown as {
        getRPCClient: vi.Mock;
      };

      getRPCClient.mockResolvedValue({
        getBalance: vi.fn().mockResolvedValue(BigInt("5000000000000000000")),
        multicall: vi
          .fn()
          .mockResolvedValue([{ status: "failure", error: new Error("Token error") }]),
      });

      const { result } = renderHook(() => useCrossChainBalances(10, [10]), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetchingCrossChainBalances).toBe(false);
      });

      // Should still return result with zero balance as fallback
      expect(result.current.balanceByTokenKey["USDC-10"]).toBe("0");
    });
  });
});
