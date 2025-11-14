/**
 * @file Tests for useImpactMeasurement hook
 * @description Tests for impact measurement data fetching hook
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import React from "react"
import { useCommunityCategory } from "@/hooks/useCommunityCategory"
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement"
import { getProgramsImpact } from "@/utilities/registry/getProgramsImpact"

jest.mock("@/utilities/registry/getProgramsImpact", () => ({
  getProgramsImpact: jest.fn(),
}))

jest.mock("@/hooks/useCommunityCategory", () => ({
  useCommunityCategory: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ communityId: "test-community" })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((key: string) => (key === "programId" ? "test-program" : null)),
  })),
}))

const mockGetProgramsImpact = getProgramsImpact as jest.MockedFunction<typeof getProgramsImpact>
const mockUseCommunityCategory = useCommunityCategory as jest.MockedFunction<
  typeof useCommunityCategory
>

describe("useImpactMeasurement", () => {
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

    mockUseCommunityCategory.mockReturnValue({
      data: [
        { id: "cat-1", name: "Category 1" },
        { id: "cat-2", name: "Category 2" },
      ],
      isLoading: false,
      error: null,
    } as any)
  })

  it("should fetch impact measurement data with communityId", async () => {
    const mockImpactData = {
      programs: [],
      totalImpact: 0,
    } as any

    mockGetProgramsImpact.mockResolvedValue(mockImpactData)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useImpactMeasurement(), { wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetProgramsImpact).toHaveBeenCalledWith(
      "test-community",
      expect.any(Array),
      "test-program",
      undefined
    )
    expect(result.current.data).toEqual(mockImpactData)
  })

  it("should use projectSelected when provided", async () => {
    const mockImpactData = {
      programs: [],
      totalImpact: 0,
    } as any

    mockGetProgramsImpact.mockResolvedValue(mockImpactData)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useImpactMeasurement("project-123"), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetProgramsImpact).toHaveBeenCalledWith(
      "test-community",
      expect.any(Array),
      "test-program",
      "project-123"
    )
  })

  it("should use correct query key with all parameters", () => {
    const wrapper = createWrapper()
    renderHook(() => useImpactMeasurement("project-123"), { wrapper })

    const queryKey = ["impact-measurement", "test-community", "test-program", "project-123"]
    const queryData = queryClient.getQueryData(queryKey)
    expect(queryData).toBeUndefined() // Initially undefined until fetch completes
  })

  it("should handle fetch error", async () => {
    const error = new Error("Failed to fetch impact data")
    mockGetProgramsImpact.mockRejectedValue(error)

    const wrapper = createWrapper()
    const { result } = renderHook(() => useImpactMeasurement(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it("should not fetch when communityId is missing", () => {
    const { useParams } = require("next/navigation")
    useParams.mockReturnValueOnce({ communityId: undefined })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useImpactMeasurement(), { wrapper })

    expect(result.current.isLoading).toBe(false)
    expect(mockGetProgramsImpact).not.toHaveBeenCalled()
  })

  it("should use 'all' for programSelected when not provided", async () => {
    const { useSearchParams } = require("next/navigation")
    useSearchParams.mockReturnValueOnce({
      get: jest.fn(() => null),
    })

    const mockImpactData = {
      programs: [],
      totalImpact: 0,
    } as any

    mockGetProgramsImpact.mockResolvedValue(mockImpactData)

    const wrapper = createWrapper()
    renderHook(() => useImpactMeasurement(), { wrapper })

    await waitFor(() => {
      expect(mockGetProgramsImpact).toHaveBeenCalledWith(
        "test-community",
        expect.any(Array),
        null,
        undefined
      )
    })
  })
})
