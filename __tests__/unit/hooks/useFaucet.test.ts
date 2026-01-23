/**
 * @file Tests for useFaucet hooks
 * @description Tests for faucet-related hooks including eligibility, balance, history, and claim functionality
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import {
  useAllFaucetBalances,
  useFaucetBalance,
  useFaucetClaim,
  useFaucetEligibility,
  useFaucetHistory,
  useFaucetRequest,
  useFaucetStats,
} from "@/hooks/useFaucet";

// Import module for spyOn
import * as faucetServiceModule from "@/utilities/faucet/faucetService";

// Use spyOn instead of jest.mock to avoid polluting global mock state
let mockFaucetServiceSpies: {
  checkEligibility: ReturnType<typeof spyOn>;
  getBalance: ReturnType<typeof spyOn>;
  getAllBalances: ReturnType<typeof spyOn>;
  getHistory: ReturnType<typeof spyOn>;
  getStats: ReturnType<typeof spyOn>;
  createRequest: ReturnType<typeof spyOn>;
  claimFaucet: ReturnType<typeof spyOn>;
  getRequest: ReturnType<typeof spyOn>;
};

// Access wagmi mock state via globalThis.__wagmiMockState__
const getWagmiState = () => (globalThis as any).__wagmiMockState__;

// Access toast mock via globalThis.__mocks__
const getMocks = () => (globalThis as any).__mocks__;

describe("useFaucet hooks", () => {
  let queryClient: QueryClient;
  let wagmiState: any;
  let mockToast: any;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    Wrapper.displayName = "QueryClientWrapper";

    return Wrapper;
  };

  beforeEach(() => {
    wagmiState = getWagmiState();
    const mocks = getMocks();
    mockToast = mocks.toast;

    // Configure wagmi mock state - use the global wagmi mock from bun-setup.ts
    wagmiState.account = {
      address: "0x1234567890123456789012345678901234567890",
      isConnected: true,
      connector: null,
    };

    // Set up spies for faucetService
    mockFaucetServiceSpies = {
      checkEligibility: spyOn(
        faucetServiceModule.faucetService,
        "checkEligibility"
      ).mockImplementation(() => Promise.resolve(null as any)),
      getBalance: spyOn(faucetServiceModule.faucetService, "getBalance").mockImplementation(() =>
        Promise.resolve(null as any)
      ),
      getAllBalances: spyOn(faucetServiceModule.faucetService, "getAllBalances").mockImplementation(
        () => Promise.resolve([] as any)
      ),
      getHistory: spyOn(faucetServiceModule.faucetService, "getHistory").mockImplementation(() =>
        Promise.resolve(null as any)
      ),
      getStats: spyOn(faucetServiceModule.faucetService, "getStats").mockImplementation(() =>
        Promise.resolve(null as any)
      ),
      createRequest: spyOn(faucetServiceModule.faucetService, "createRequest").mockImplementation(
        () => Promise.resolve(null as any)
      ),
      claimFaucet: spyOn(faucetServiceModule.faucetService, "claimFaucet").mockImplementation(() =>
        Promise.resolve(null as any)
      ),
      getRequest: spyOn(faucetServiceModule.faucetService, "getRequest").mockImplementation(() =>
        Promise.resolve(null as any)
      ),
    };

    // Clear mock call history
    Object.values(mockFaucetServiceSpies).forEach((spy) => spy.mockClear());
    if (mockToast?.success?.mockClear) mockToast.success.mockClear();
    if (mockToast?.error?.mockClear) mockToast.error.mockClear();
  });

  // NOTE: No afterEach cleanup needed for spies - spyOn creates fresh mocks in beforeEach

  describe("useFaucetEligibility", () => {
    it("should not fetch when chainId is missing", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetEligibility(undefined), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockFaucetServiceSpies.checkEligibility).not.toHaveBeenCalled();
    });

    it("should fetch eligibility when all required params are provided", async () => {
      const mockEligibility = { eligible: true, requestId: "req-123" };
      mockFaucetServiceSpies.checkEligibility.mockResolvedValue(mockEligibility as any);

      const transaction = { type: "gas", amount: "0.1" } as any;

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetEligibility(10, transaction), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFaucetServiceSpies.checkEligibility).toHaveBeenCalledWith(
        10,
        expect.any(String),
        transaction
      );
      expect(result.current.data).toEqual(mockEligibility);
    });
  });

  describe("useFaucetBalance", () => {
    it("should fetch balance for a chain", async () => {
      const mockBalance = { balance: "1000", chainId: 10 };
      mockFaucetServiceSpies.getBalance.mockResolvedValue(mockBalance as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetBalance(10), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFaucetServiceSpies.getBalance).toHaveBeenCalledWith(10);
      expect(result.current.data).toEqual(mockBalance);
    });

    it("should not fetch when chainId is missing", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetBalance(undefined), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockFaucetServiceSpies.getBalance).not.toHaveBeenCalled();
    });
  });

  describe("useAllFaucetBalances", () => {
    it("should fetch all balances", async () => {
      const mockBalances = [
        { chainId: 10, balance: "1000" },
        { chainId: 42220, balance: "500" },
      ];
      mockFaucetServiceSpies.getAllBalances.mockResolvedValue(mockBalances as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAllFaucetBalances(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFaucetServiceSpies.getAllBalances).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockBalances);
    });
  });

  describe("useFaucetHistory", () => {
    it("should fetch history for an address", async () => {
      const mockHistory = {
        requests: [{ id: "req-1", status: "CLAIMED" }],
        pageInfo: { hasNextPage: false },
      };
      mockFaucetServiceSpies.getHistory.mockResolvedValue(mockHistory as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetHistory("0x123", 10), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFaucetServiceSpies.getHistory).toHaveBeenCalledWith("0x123", 10);
      expect(result.current.data).toEqual(mockHistory);
    });

    it("should not fetch when address is missing", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetHistory(undefined), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockFaucetServiceSpies.getHistory).not.toHaveBeenCalled();
    });
  });

  describe("useFaucetStats", () => {
    it("should fetch stats with default days", async () => {
      const mockStats = { totalClaims: 100, totalAmount: "10000" };
      mockFaucetServiceSpies.getStats.mockResolvedValue(mockStats as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetStats(10), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFaucetServiceSpies.getStats).toHaveBeenCalledWith(10, 7);
      expect(result.current.data).toEqual(mockStats);
    });

    it("should fetch stats with custom days", async () => {
      const mockStats = { totalClaims: 50, totalAmount: "5000" };
      mockFaucetServiceSpies.getStats.mockResolvedValue(mockStats as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetStats(10, 30), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFaucetServiceSpies.getStats).toHaveBeenCalledWith(10, 30);
    });
  });

  describe("useFaucetClaim", () => {
    it("should throw error when wallet is not connected", async () => {
      // Configure wagmi state with no address
      wagmiState.account = {
        address: undefined,
        isConnected: false,
        connector: null,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetClaim(), { wrapper });

      await expect(
        result.current.claimFaucet(10, { type: "gas", amount: "0.1" } as any)
      ).rejects.toThrow("Wallet not connected");
    });

    it("should successfully claim faucet", async () => {
      const mockRequestResponse = { eligible: true, requestId: "req-123" };
      const mockClaimResponse = { transactionHash: "0xtxhash" };

      mockFaucetServiceSpies.createRequest.mockResolvedValue(mockRequestResponse as any);
      mockFaucetServiceSpies.claimFaucet.mockResolvedValue(mockClaimResponse as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetClaim(), { wrapper });

      await act(async () => {
        const response = await result.current.claimFaucet(10, {
          type: "gas",
          amount: "0.1",
        } as any);

        expect(response).toEqual(mockClaimResponse);
      });

      expect(mockFaucetServiceSpies.createRequest).toHaveBeenCalled();
      expect(mockFaucetServiceSpies.claimFaucet).toHaveBeenCalledWith("req-123");
      expect(result.current.transactionHash).toBe("0xtxhash");
      expect(mockToast.success).toHaveBeenCalledWith("Funds received successfully!");
    });

    it("should handle ineligible response", async () => {
      const mockRequestResponse = { eligible: false, requestId: null };

      mockFaucetServiceSpies.createRequest.mockResolvedValue(mockRequestResponse as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetClaim(), { wrapper });

      await act(async () => {
        await expect(
          result.current.claimFaucet(10, { type: "gas", amount: "0.1" } as any)
        ).rejects.toThrow("Not eligible for faucet");
      });

      expect(result.current.claimError).toBe("Not eligible for faucet");
      expect(mockToast.error).toHaveBeenCalledWith("Not eligible for faucet");
    });

    it("should handle claim error", async () => {
      const mockRequestResponse = { eligible: true, requestId: "req-123" };
      const error = new Error("Claim failed");

      mockFaucetServiceSpies.createRequest.mockResolvedValue(mockRequestResponse as any);
      mockFaucetServiceSpies.claimFaucet.mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetClaim(), { wrapper });

      await act(async () => {
        await expect(
          result.current.claimFaucet(10, { type: "gas", amount: "0.1" } as any)
        ).rejects.toThrow("Claim failed");
      });

      expect(result.current.claimError).toBe("Claim failed");
      expect(mockToast.error).toHaveBeenCalledWith("Claim failed");
    });

    it("should reset state when resetFaucetState is called", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetClaim(), { wrapper });

      act(() => {
        result.current.resetFaucetState();
      });

      expect(result.current.isClaimingFaucet).toBe(false);
      expect(result.current.claimError).toBe(null);
      expect(result.current.transactionHash).toBe(null);
    });
  });

  describe("useFaucetRequest", () => {
    it("should fetch request when requestId is provided", async () => {
      const mockRequest = { id: "req-123", status: "PENDING" };
      mockFaucetServiceSpies.getRequest.mockResolvedValue(mockRequest as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetRequest("req-123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFaucetServiceSpies.getRequest).toHaveBeenCalledWith("req-123");
      expect(result.current.data).toEqual(mockRequest);
    });

    it("should not fetch when requestId is null", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFaucetRequest(null), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockFaucetServiceSpies.getRequest).not.toHaveBeenCalled();
    });
  });
});
