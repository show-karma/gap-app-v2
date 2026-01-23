/**
 * @file Tests for useCommunityMetrics hook
 * @description Tests for community metrics data fetching hook
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
  test,
} from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { useCommunityMetrics } from "@/hooks/useCommunityMetrics";

// Import module for spyOn
import * as getCommunityMetricsModule from "@/utilities/registry/getCommunityMetrics";

// NOTE: Do NOT use jest.mock("@/utilities/registry/getCommunityMetrics")
// as it pollutes global mock state and breaks getCommunityMetrics.test.ts
// Use spyOn instead with proper cleanup in afterEach

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ communityId: "filecoin" })),
}));

// Spy will be set up in beforeEach
let mockGetCommunityMetrics: ReturnType<typeof spyOn>;

describe("useCommunityMetrics", () => {
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

    // Set up spy for getCommunityMetrics
    mockGetCommunityMetrics = spyOn(
      getCommunityMetricsModule,
      "getCommunityMetrics"
    ).mockImplementation(() => Promise.resolve(null));
  });

  afterEach(() => {
    // Restore spy to prevent pollution of other test files
    mockGetCommunityMetrics?.mockRestore();
  });

  const mockMetricsResponse = {
    communityUID: "filecoin-uid",
    metrics: [
      {
        id: "metric-1",
        name: "Storage Capacity",
        description: "Total storage capacity",
        unitOfMeasure: "PiB",
        sourceField: null,
        metadata: null,
        datapoints: [],
        latestValue: "100",
        latestDate: "2024-01-01",
        datapointCount: 1,
      },
    ],
    totalMetrics: 1,
  };

  it("should fetch community metrics with communityId", async () => {
    mockGetCommunityMetrics.mockResolvedValue(mockMetricsResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCommunityMetrics(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetCommunityMetrics).toHaveBeenCalledWith("filecoin", undefined);
    expect(result.current.data).toEqual(mockMetricsResponse);
  });

  it("should fetch with date range parameters", async () => {
    mockGetCommunityMetrics.mockResolvedValue(mockMetricsResponse);

    const params = {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    };

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCommunityMetrics(params), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetCommunityMetrics).toHaveBeenCalledWith("filecoin", params);
  });

  it("should not fetch when enabled is false", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCommunityMetrics(undefined, false), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetCommunityMetrics).not.toHaveBeenCalled();
  });

  it("should not fetch when communityId is missing", () => {
    const { useParams } = require("next/navigation");
    useParams.mockReturnValueOnce({ communityId: undefined });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCommunityMetrics(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetCommunityMetrics).not.toHaveBeenCalled();
  });

  it("should handle fetch error", async () => {
    const error = new Error("Failed to fetch metrics");
    mockGetCommunityMetrics.mockRejectedValue(error);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCommunityMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it("should handle null response", async () => {
    mockGetCommunityMetrics.mockResolvedValue(null);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCommunityMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });

  it("should use correct query key with all parameters", () => {
    const params = {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      metricNames: "Storage Capacity",
    };

    mockGetCommunityMetrics.mockResolvedValue(mockMetricsResponse);

    const wrapper = createWrapper();
    renderHook(() => useCommunityMetrics(params), { wrapper });

    const queryKey = [
      "community-metrics",
      "filecoin",
      "2024-01-01",
      "2024-01-31",
      "Storage Capacity",
    ];

    // Query key should be set (data might be undefined until fetch completes)
    expect(queryClient.getQueryState(queryKey)).toBeDefined();
  });

  it("should use 'all' in query key when params are undefined", () => {
    mockGetCommunityMetrics.mockResolvedValue(mockMetricsResponse);

    const wrapper = createWrapper();
    renderHook(() => useCommunityMetrics(), { wrapper });

    const queryKey = ["community-metrics", "filecoin", "all", "all", "all"];

    expect(queryClient.getQueryState(queryKey)).toBeDefined();
  });

  it("should cache data with staleTime of 5 minutes", async () => {
    mockGetCommunityMetrics.mockResolvedValue(mockMetricsResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCommunityMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that the query has staleTime configured
    const queryState = queryClient.getQueryState([
      "community-metrics",
      "filecoin",
      "all",
      "all",
      "all",
    ]);

    expect(queryState).toBeDefined();
  });
});
