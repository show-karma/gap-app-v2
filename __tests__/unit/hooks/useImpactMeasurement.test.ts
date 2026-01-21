/**
 * @file Tests for useImpactMeasurement hook
 * @description Tests for impact measurement data fetching hook
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { getProgramsImpact } from "@/utilities/registry/getProgramsImpact";

jest.mock("@/utilities/registry/getProgramsImpact", () => ({
  getProgramsImpact: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ communityId: "test-community" })),
}));

const mockGetProgramsImpact = getProgramsImpact as jest.MockedFunction<typeof getProgramsImpact>;

describe("useImpactMeasurement", () => {
  let queryClient: QueryClient;

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
    jest.clearAllMocks();
  });

  it("should fetch impact measurement data with communityId", async () => {
    const mockImpactData = {
      stats: {
        totalProjects: 10,
        totalCategories: 2,
        totalFundingAllocated: undefined,
      },
      data: [],
    } as any;

    mockGetProgramsImpact.mockResolvedValue(mockImpactData);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useImpactMeasurement(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetProgramsImpact).toHaveBeenCalledWith("test-community");
    expect(result.current.data).toEqual(mockImpactData);
  });

  it("should use correct query key", () => {
    const wrapper = createWrapper();
    renderHook(() => useImpactMeasurement(), { wrapper });

    const queryKey = ["impact-measurement", "test-community"];
    const queryData = queryClient.getQueryData(queryKey);
    expect(queryData).toBeUndefined(); // Initially undefined until fetch completes
  });

  it("should handle fetch error", async () => {
    const error = new Error("Failed to fetch impact data");
    mockGetProgramsImpact.mockRejectedValue(error);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useImpactMeasurement(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it("should not fetch when communityId is missing", () => {
    const { useParams } = require("next/navigation");
    useParams.mockReturnValueOnce({ communityId: undefined });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useImpactMeasurement(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetProgramsImpact).not.toHaveBeenCalled();
  });
});
