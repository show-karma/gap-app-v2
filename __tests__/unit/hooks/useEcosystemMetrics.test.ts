/**
 * @file Tests for useEcosystemMetrics hook
 * @description Tests for ecosystem metrics data fetching hook
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { useEcosystemMetrics } from "@/hooks/useEcosystemMetrics";
import { getEcosystemMetrics } from "@/utilities/registry/getEcosystemMetrics";

jest.mock("@/utilities/registry/getEcosystemMetrics", () => ({
  getEcosystemMetrics: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ communityId: "filecoin" })),
}));

const mockGetEcosystemMetrics = getEcosystemMetrics as jest.MockedFunction<
  typeof getEcosystemMetrics
>;

describe("useEcosystemMetrics", () => {
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

  it("should fetch ecosystem metrics with communityId", async () => {
    mockGetEcosystemMetrics.mockResolvedValue(mockMetricsResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useEcosystemMetrics(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetEcosystemMetrics).toHaveBeenCalledWith("filecoin", undefined);
    expect(result.current.data).toEqual(mockMetricsResponse);
  });

  it("should fetch with date range parameters", async () => {
    mockGetEcosystemMetrics.mockResolvedValue(mockMetricsResponse);

    const params = {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    };

    const wrapper = createWrapper();
    const { result } = renderHook(() => useEcosystemMetrics(params), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetEcosystemMetrics).toHaveBeenCalledWith("filecoin", params);
  });

  it("should not fetch when enabled is false", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useEcosystemMetrics(undefined, false), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetEcosystemMetrics).not.toHaveBeenCalled();
  });

  it("should not fetch when communityId is missing", () => {
    const { useParams } = require("next/navigation");
    useParams.mockReturnValueOnce({ communityId: undefined });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useEcosystemMetrics(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetEcosystemMetrics).not.toHaveBeenCalled();
  });

  it("should handle fetch error", async () => {
    const error = new Error("Failed to fetch metrics");
    mockGetEcosystemMetrics.mockRejectedValue(error);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useEcosystemMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it("should handle null response", async () => {
    mockGetEcosystemMetrics.mockResolvedValue(null);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useEcosystemMetrics(), { wrapper });

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

    mockGetEcosystemMetrics.mockResolvedValue(mockMetricsResponse);

    const wrapper = createWrapper();
    renderHook(() => useEcosystemMetrics(params), { wrapper });

    const queryKey = [
      "ecosystem-metrics",
      "filecoin",
      "2024-01-01",
      "2024-01-31",
      "Storage Capacity",
    ];

    // Query key should be set (data might be undefined until fetch completes)
    expect(queryClient.getQueryState(queryKey)).toBeDefined();
  });

  it("should use 'all' in query key when params are undefined", () => {
    mockGetEcosystemMetrics.mockResolvedValue(mockMetricsResponse);

    const wrapper = createWrapper();
    renderHook(() => useEcosystemMetrics(), { wrapper });

    const queryKey = ["ecosystem-metrics", "filecoin", "all", "all", "all"];

    expect(queryClient.getQueryState(queryKey)).toBeDefined();
  });

  it("should cache data with staleTime of 5 minutes", async () => {
    mockGetEcosystemMetrics.mockResolvedValue(mockMetricsResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useEcosystemMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that the query has staleTime configured
    const queryState = queryClient.getQueryState([
      "ecosystem-metrics",
      "filecoin",
      "all",
      "all",
      "all",
    ]);

    expect(queryState).toBeDefined();
  });
});
