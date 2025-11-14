/**
 * @file Tests for useFaucet hooks
 * @description Tests for faucet-related hooks including eligibility, balance, history, and claim functionality
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import React from "react"
import toast from "react-hot-toast"
import { useAccount } from "wagmi"
import {
  useAllFaucetBalances,
  useFaucetBalance,
  useFaucetClaim,
  useFaucetEligibility,
  useFaucetHistory,
  useFaucetRequest,
  useFaucetStats,
} from "@/hooks/useFaucet"
import { faucetService } from "@/utilities/faucet/faucetService"

jest.mock("@/utilities/faucet/faucetService", () => ({
  faucetService: {
    checkEligibility: jest.fn(),
    getBalance: jest.fn(),
    getAllBalances: jest.fn(),
    getHistory: jest.fn(),
    getStats: jest.fn(),
    createRequest: jest.fn(),
    claimFaucet: jest.fn(),
    getRequest: jest.fn(),
  },
}))

jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
}))

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockFaucetService = faucetService as jest.Mocked<typeof faucetService>
const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>

describe("useFaucet hooks", () => {
  let queryClient: QueryClient

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    Wrapper.displayName = "QueryClientWrapper"

    return Wrapper
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({
      address: "0x1234567890123456789012345678901234567890",
      isConnected: true,
    } as any)
  })

  describe("useFaucetEligibility", () => {
    it("should not fetch when chainId is missing", () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetEligibility(undefined), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(mockFaucetService.checkEligibility).not.toHaveBeenCalled()
    })

    it("should fetch eligibility when all required params are provided", async () => {
      const mockEligibility = { eligible: true, requestId: "req-123" }
      mockFaucetService.checkEligibility.mockResolvedValue(mockEligibility as any)

      const transaction = { type: "gas", amount: "0.1" } as any

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetEligibility(10, transaction), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFaucetService.checkEligibility).toHaveBeenCalledWith(
        10,
        expect.any(String),
        transaction
      )
      expect(result.current.data).toEqual(mockEligibility)
    })
  })

  describe("useFaucetBalance", () => {
    it("should fetch balance for a chain", async () => {
      const mockBalance = { balance: "1000", chainId: 10 }
      mockFaucetService.getBalance.mockResolvedValue(mockBalance as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetBalance(10), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFaucetService.getBalance).toHaveBeenCalledWith(10)
      expect(result.current.data).toEqual(mockBalance)
    })

    it("should not fetch when chainId is missing", () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetBalance(undefined), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(mockFaucetService.getBalance).not.toHaveBeenCalled()
    })
  })

  describe("useAllFaucetBalances", () => {
    it("should fetch all balances", async () => {
      const mockBalances = [
        { chainId: 10, balance: "1000" },
        { chainId: 42220, balance: "500" },
      ]
      mockFaucetService.getAllBalances.mockResolvedValue(mockBalances as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAllFaucetBalances(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFaucetService.getAllBalances).toHaveBeenCalled()
      expect(result.current.data).toEqual(mockBalances)
    })
  })

  describe("useFaucetHistory", () => {
    it("should fetch history for an address", async () => {
      const mockHistory = {
        requests: [{ id: "req-1", status: "CLAIMED" }],
        pageInfo: { hasNextPage: false },
      }
      mockFaucetService.getHistory.mockResolvedValue(mockHistory as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetHistory("0x123", 10), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFaucetService.getHistory).toHaveBeenCalledWith("0x123", 10)
      expect(result.current.data).toEqual(mockHistory)
    })

    it("should not fetch when address is missing", () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetHistory(undefined), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(mockFaucetService.getHistory).not.toHaveBeenCalled()
    })
  })

  describe("useFaucetStats", () => {
    it("should fetch stats with default days", async () => {
      const mockStats = { totalClaims: 100, totalAmount: "10000" }
      mockFaucetService.getStats.mockResolvedValue(mockStats as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetStats(10), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFaucetService.getStats).toHaveBeenCalledWith(10, 7)
      expect(result.current.data).toEqual(mockStats)
    })

    it("should fetch stats with custom days", async () => {
      const mockStats = { totalClaims: 50, totalAmount: "5000" }
      mockFaucetService.getStats.mockResolvedValue(mockStats as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetStats(10, 30), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFaucetService.getStats).toHaveBeenCalledWith(10, 30)
    })
  })

  describe("useFaucetClaim", () => {
    it("should throw error when wallet is not connected", async () => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      } as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetClaim(), { wrapper })

      await expect(
        result.current.claimFaucet(10, { type: "gas", amount: "0.1" } as any)
      ).rejects.toThrow("Wallet not connected")
    })

    it("should successfully claim faucet", async () => {
      const mockRequestResponse = { eligible: true, requestId: "req-123" }
      const mockClaimResponse = { transactionHash: "0xtxhash" }

      mockFaucetService.createRequest.mockResolvedValue(mockRequestResponse as any)
      mockFaucetService.claimFaucet.mockResolvedValue(mockClaimResponse as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetClaim(), { wrapper })

      await act(async () => {
        const response = await result.current.claimFaucet(10, {
          type: "gas",
          amount: "0.1",
        } as any)

        expect(response).toEqual(mockClaimResponse)
      })

      expect(mockFaucetService.createRequest).toHaveBeenCalled()
      expect(mockFaucetService.claimFaucet).toHaveBeenCalledWith("req-123")
      expect(result.current.transactionHash).toBe("0xtxhash")
      expect(toast.success).toHaveBeenCalledWith("Funds received successfully!")
    })

    it("should handle ineligible response", async () => {
      const mockRequestResponse = { eligible: false, requestId: null }

      mockFaucetService.createRequest.mockResolvedValue(mockRequestResponse as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetClaim(), { wrapper })

      await act(async () => {
        await expect(
          result.current.claimFaucet(10, { type: "gas", amount: "0.1" } as any)
        ).rejects.toThrow("Not eligible for faucet")
      })

      expect(result.current.claimError).toBe("Not eligible for faucet")
      expect(toast.error).toHaveBeenCalledWith("Not eligible for faucet")
    })

    it("should handle claim error", async () => {
      const mockRequestResponse = { eligible: true, requestId: "req-123" }
      const error = new Error("Claim failed")

      mockFaucetService.createRequest.mockResolvedValue(mockRequestResponse as any)
      mockFaucetService.claimFaucet.mockRejectedValue(error)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetClaim(), { wrapper })

      await act(async () => {
        await expect(
          result.current.claimFaucet(10, { type: "gas", amount: "0.1" } as any)
        ).rejects.toThrow("Claim failed")
      })

      expect(result.current.claimError).toBe("Claim failed")
      expect(toast.error).toHaveBeenCalledWith("Claim failed")
    })

    it("should reset state when resetFaucetState is called", () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetClaim(), { wrapper })

      act(() => {
        result.current.resetFaucetState()
      })

      expect(result.current.isClaimingFaucet).toBe(false)
      expect(result.current.claimError).toBe(null)
      expect(result.current.transactionHash).toBe(null)
    })
  })

  describe("useFaucetRequest", () => {
    it("should fetch request when requestId is provided", async () => {
      const mockRequest = { id: "req-123", status: "PENDING" }
      mockFaucetService.getRequest.mockResolvedValue(mockRequest as any)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetRequest("req-123"), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFaucetService.getRequest).toHaveBeenCalledWith("req-123")
      expect(result.current.data).toEqual(mockRequest)
    })

    it("should not fetch when requestId is null", () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useFaucetRequest(null), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(mockFaucetService.getRequest).not.toHaveBeenCalled()
    })
  })
})
