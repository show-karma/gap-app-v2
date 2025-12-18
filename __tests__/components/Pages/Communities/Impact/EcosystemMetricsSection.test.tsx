/**
 * @file Tests for EcosystemMetricsSection component
 * @description Tests for the ecosystem metrics display component
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";
import React from "react";
import { EcosystemMetricsSection } from "@/components/Pages/Communities/Impact/EcosystemMetricsSection";
import { useEcosystemMetrics } from "@/hooks/useEcosystemMetrics";
import type { EcosystemMetricsResponse } from "@/types/ecosystem-metrics";

jest.mock("@/hooks/useEcosystemMetrics");
jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("@tremor/react", () => ({
  AreaChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="area-chart">{JSON.stringify(data)}</div>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
}));

jest.mock("@/components/Pages/Communities/Impact/TimeframeSelector", () => ({
  TimeframeSelector: ({
    selectedTimeframe,
    onTimeframeChange,
  }: {
    selectedTimeframe: string;
    onTimeframeChange: (value: string) => void;
  }) => (
    <div data-testid="timeframe-selector">
      <button onClick={() => onTimeframeChange("3_months")}>{selectedTimeframe}</button>
    </div>
  ),
}));

const mockUseEcosystemMetrics = useEcosystemMetrics as jest.MockedFunction<
  typeof useEcosystemMetrics
>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe("EcosystemMetricsSection", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ communityId: "filecoin" });
  });

  const mockMetricsResponse: EcosystemMetricsResponse = {
    communityUID: "filecoin-uid",
    metrics: [
      {
        id: "metric-1",
        name: "Storage Capacity",
        description: "Total storage capacity in the network",
        unitOfMeasure: "PiB",
        sourceField: null,
        metadata: null,
        datapoints: [
          { date: "2024-01-01", value: "100", proof: null },
          { date: "2024-01-02", value: "200", proof: null },
        ],
        latestValue: "200",
        latestDate: "2024-01-02",
        datapointCount: 2,
      },
      {
        id: "metric-2",
        name: "Active Storage Deals",
        description: "Number of active storage deals",
        unitOfMeasure: "deals",
        sourceField: null,
        metadata: null,
        datapoints: [{ date: "2024-01-01", value: "5000", proof: null }],
        latestValue: "5000",
        latestDate: "2024-01-01",
        datapointCount: 1,
      },
    ],
    totalMetrics: 2,
  };

  it("should render nothing for non-Filecoin communities", () => {
    mockUseParams.mockReturnValue({ communityId: "ethereum" });
    mockUseEcosystemMetrics.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    const { container } = render(<EcosystemMetricsSection />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it("should render loading skeletons when loading", () => {
    mockUseEcosystemMetrics.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    expect(screen.getByText("Filecoin Network Metrics")).toBeInTheDocument();
    expect(screen.getAllByText("Loading chart data...")).toHaveLength(2);
  });

  it("should render nothing on error", () => {
    mockUseEcosystemMetrics.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Failed to fetch"),
      isError: true,
    } as any);

    const wrapper = createWrapper();
    const { container } = render(<EcosystemMetricsSection />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it("should render empty state when metrics array is empty", () => {
    const emptyResponse: EcosystemMetricsResponse = {
      communityUID: "filecoin-uid",
      metrics: [],
      totalMetrics: 0,
    };

    mockUseEcosystemMetrics.mockReturnValue({
      data: emptyResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    expect(screen.getByText("Filecoin Network Metrics")).toBeInTheDocument();
    expect(screen.getByText("No metrics available")).toBeInTheDocument();
  });

  it("should render metrics when data is available", async () => {
    mockUseEcosystemMetrics.mockReturnValue({
      data: mockMetricsResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Filecoin Network Metrics")).toBeInTheDocument();
    });

    expect(screen.getByText("Storage Capacity")).toBeInTheDocument();
    expect(screen.getByText("Active Storage Deals")).toBeInTheDocument();
    expect(screen.getByText("2 metrics")).toBeInTheDocument();
  });

  it("should render metric cards with charts", async () => {
    mockUseEcosystemMetrics.mockReturnValue({
      data: mockMetricsResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("area-chart")).toHaveLength(2);
    });
  });

  it("should render metric descriptions when available", async () => {
    mockUseEcosystemMetrics.mockReturnValue({
      data: mockMetricsResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Total storage capacity in the network")).toBeInTheDocument();
      expect(screen.getByText("Number of active storage deals")).toBeInTheDocument();
    });
  });

  it("should render latest values and dates", async () => {
    mockUseEcosystemMetrics.mockReturnValue({
      data: mockMetricsResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    await waitFor(() => {
      // Latest values should be displayed (formatted)
      // Check for formatted values with units
      expect(screen.getByText(/200 PiB/)).toBeInTheDocument();
      expect(screen.getByText(/5K deals/)).toBeInTheDocument();
    });
  });

  it("should handle case-insensitive community ID matching", () => {
    mockUseParams.mockReturnValue({ communityId: "FIL" });
    mockUseEcosystemMetrics.mockReturnValue({
      data: mockMetricsResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    expect(screen.getByText("Filecoin Network Metrics")).toBeInTheDocument();
  });

  it("should render nothing when data is null", () => {
    mockUseEcosystemMetrics.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    const { container } = render(<EcosystemMetricsSection />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it("should render nothing when data is invalid (fails type guard)", () => {
    mockUseEcosystemMetrics.mockReturnValue({
      data: { invalid: "data" } as any,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    const { container } = render(<EcosystemMetricsSection />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it("should display correct metric count", async () => {
    const singleMetricResponse: EcosystemMetricsResponse = {
      communityUID: "filecoin-uid",
      metrics: [mockMetricsResponse.metrics[0]],
      totalMetrics: 1,
    };

    mockUseEcosystemMetrics.mockReturnValue({
      data: singleMetricResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("1 metric")).toBeInTheDocument();
    });
  });

  it("should display N/A when latestValue is null", async () => {
    const metricWithNullValue: EcosystemMetricsResponse = {
      communityUID: "filecoin-uid",
      metrics: [
        {
          id: "metric-1",
          name: "Storage Capacity",
          description: "Total storage capacity in the network",
          unitOfMeasure: "PiB",
          sourceField: null,
          metadata: null,
          datapoints: [{ date: "2024-01-01", value: "100", proof: null }],
          latestValue: null, // This should trigger the "N/A" fallback
          latestDate: "2024-01-01",
          datapointCount: 1,
        },
      ],
      totalMetrics: 1,
    };

    mockUseEcosystemMetrics.mockReturnValue({
      data: metricWithNullValue,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  it("should calculate date range correctly for 3_months timeframe", () => {
    // Mock useState to return "3_months" as initial timeframe
    const originalUseState = React.useState;
    jest.spyOn(React, "useState").mockImplementationOnce(() => ["3_months", jest.fn()]);

    mockUseEcosystemMetrics.mockReturnValue({
      data: mockMetricsResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    // The hook should be called with date range for 3 months ago
    const expectedStartDate = new Date();
    expectedStartDate.setMonth(expectedStartDate.getMonth() - 3);
    const expectedEndDate = new Date();

    expect(mockUseEcosystemMetrics).toHaveBeenCalledWith(
      {
        startDate: expectedStartDate.toISOString().split("T")[0],
        endDate: expectedEndDate.toISOString().split("T")[0],
      },
      true
    );

    // Restore original useState
    React.useState = originalUseState;
  });

  it("should calculate date range correctly for 6_months timeframe", () => {
    // Mock useState to return "6_months" as initial timeframe
    const originalUseState = React.useState;
    jest.spyOn(React, "useState").mockImplementationOnce(() => ["6_months", jest.fn()]);

    mockUseEcosystemMetrics.mockReturnValue({
      data: mockMetricsResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    // The hook should be called with date range for 6 months ago
    const expectedStartDate = new Date();
    expectedStartDate.setMonth(expectedStartDate.getMonth() - 6);
    const expectedEndDate = new Date();

    expect(mockUseEcosystemMetrics).toHaveBeenCalledWith(
      {
        startDate: expectedStartDate.toISOString().split("T")[0],
        endDate: expectedEndDate.toISOString().split("T")[0],
      },
      true
    );

    // Restore original useState
    React.useState = originalUseState;
  });

  it("should calculate date range correctly for 1_year timeframe", () => {
    // Mock useState to return "1_year" as initial timeframe
    const originalUseState = React.useState;
    jest.spyOn(React, "useState").mockImplementationOnce(() => ["1_year", jest.fn()]);

    mockUseEcosystemMetrics.mockReturnValue({
      data: mockMetricsResponse,
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    const wrapper = createWrapper();
    render(<EcosystemMetricsSection />, { wrapper });

    // The hook should be called with date range for 1 year ago
    const expectedStartDate = new Date();
    expectedStartDate.setFullYear(expectedStartDate.getFullYear() - 1);
    const expectedEndDate = new Date();

    expect(mockUseEcosystemMetrics).toHaveBeenCalledWith(
      {
        startDate: expectedStartDate.toISOString().split("T")[0],
        endDate: expectedEndDate.toISOString().split("T")[0],
      },
      true
    );

    // Restore original useState
    React.useState = originalUseState;
  });
});
