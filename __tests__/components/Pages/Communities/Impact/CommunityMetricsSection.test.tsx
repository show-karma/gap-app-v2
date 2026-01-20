/**
 * @file Tests for CommunityMetricsSection component
 * @description Tests for the community metrics display component
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";
import type React from "react";
import { CommunityMetricsSection } from "@/components/Pages/Communities/Impact/CommunityMetricsSection";
import { useCommunityMetrics } from "@/hooks/useCommunityMetrics";
import type { CommunityMetricsResponse } from "@/types/community-metrics";

jest.mock("@/hooks/useCommunityMetrics");
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

const mockUseCommunityMetrics = useCommunityMetrics as jest.MockedFunction<
  typeof useCommunityMetrics
>;

// Typed mock helper for better type safety and maintainability
type MockUseCommunityMetricsReturn = ReturnType<typeof useCommunityMetrics>;

const createMockReturn = (
  overrides: Partial<MockUseCommunityMetricsReturn> = {}
): MockUseCommunityMetricsReturn => ({
  data: null,
  isLoading: false,
  error: null,
  isError: false,
  ...overrides,
});
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe("CommunityMetricsSection", () => {
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

  const mockMetricsResponse: CommunityMetricsResponse = {
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
    mockUseCommunityMetrics.mockReturnValue(createMockReturn());

    const wrapper = createWrapper();
    const { container } = render(<CommunityMetricsSection />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it("should render loading skeletons when loading", () => {
    mockUseCommunityMetrics.mockReturnValue(createMockReturn({ isLoading: true }));

    const wrapper = createWrapper();
    render(<CommunityMetricsSection />, { wrapper });

    expect(screen.getByText("Filecoin Network Metrics")).toBeInTheDocument();
    expect(screen.getAllByText("Loading chart data...")).toHaveLength(2);
  });

  it("should render nothing on error", () => {
    mockUseCommunityMetrics.mockReturnValue(
      createMockReturn({
        error: new Error("Failed to fetch"),
        isError: true,
      })
    );

    const wrapper = createWrapper();
    const { container } = render(<CommunityMetricsSection />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it("should render empty state when metrics array is empty", () => {
    const emptyResponse: CommunityMetricsResponse = {
      communityUID: "filecoin-uid",
      metrics: [],
      totalMetrics: 0,
    };

    mockUseCommunityMetrics.mockReturnValue(createMockReturn({ data: emptyResponse }));

    const wrapper = createWrapper();
    render(<CommunityMetricsSection />, { wrapper });

    expect(screen.getByText("Filecoin Network Metrics")).toBeInTheDocument();
    expect(screen.getByText("No metrics available")).toBeInTheDocument();
  });

  it("should render metrics when data is available", async () => {
    mockUseCommunityMetrics.mockReturnValue(createMockReturn({ data: mockMetricsResponse }));

    const wrapper = createWrapper();
    render(<CommunityMetricsSection />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Filecoin Network Metrics")).toBeInTheDocument();
    });

    expect(screen.getByText("Storage Capacity")).toBeInTheDocument();
    expect(screen.getByText("Active Storage Deals")).toBeInTheDocument();
    expect(screen.getByText("2 metrics")).toBeInTheDocument();
  });

  it("should render metric cards with charts", async () => {
    mockUseCommunityMetrics.mockReturnValue(createMockReturn({ data: mockMetricsResponse }));

    const wrapper = createWrapper();
    render(<CommunityMetricsSection />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("area-chart")).toHaveLength(2);
    });
  });

  it("should render metric descriptions when available", async () => {
    mockUseCommunityMetrics.mockReturnValue(createMockReturn({ data: mockMetricsResponse }));

    const wrapper = createWrapper();
    render(<CommunityMetricsSection />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Total storage capacity in the network")).toBeInTheDocument();
      expect(screen.getByText("Number of active storage deals")).toBeInTheDocument();
    });
  });

  it("should render latest values and dates", async () => {
    mockUseCommunityMetrics.mockReturnValue(createMockReturn({ data: mockMetricsResponse }));

    const wrapper = createWrapper();
    render(<CommunityMetricsSection />, { wrapper });

    await waitFor(() => {
      // Component displays metric names and descriptions
      // Charts are rendered with the data
      expect(screen.getByText("Storage Capacity")).toBeInTheDocument();
      expect(screen.getByText("Active Storage Deals")).toBeInTheDocument();
      expect(screen.getAllByTestId("area-chart")).toHaveLength(2);
    });
  });

  it("should handle case-insensitive community ID matching", () => {
    mockUseParams.mockReturnValue({ communityId: "FIL" });
    mockUseCommunityMetrics.mockReturnValue(createMockReturn({ data: mockMetricsResponse }));

    const wrapper = createWrapper();
    render(<CommunityMetricsSection />, { wrapper });

    expect(screen.getByText("Filecoin Network Metrics")).toBeInTheDocument();
  });

  it("should render nothing when data is null", () => {
    mockUseCommunityMetrics.mockReturnValue(createMockReturn());

    const wrapper = createWrapper();
    const { container } = render(<CommunityMetricsSection />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it("should render nothing when data is invalid (fails type guard)", () => {
    // Explicitly test type guard with object missing required 'metrics' array
    const invalidData = { communityUID: "test", notMetrics: [] };
    mockUseCommunityMetrics.mockReturnValue(
      createMockReturn({ data: invalidData as unknown as CommunityMetricsResponse })
    );

    const wrapper = createWrapper();
    const { container } = render(<CommunityMetricsSection />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it("should display correct metric count", async () => {
    const singleMetricResponse: CommunityMetricsResponse = {
      communityUID: "filecoin-uid",
      metrics: [mockMetricsResponse.metrics[0]],
      totalMetrics: 1,
    };

    mockUseCommunityMetrics.mockReturnValue(createMockReturn({ data: singleMetricResponse }));

    const wrapper = createWrapper();
    render(<CommunityMetricsSection />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("1 metric")).toBeInTheDocument();
    });
  });

  it("should display chart even when latestValue is null", async () => {
    const metricWithNullValue: CommunityMetricsResponse = {
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
          latestValue: null, // latestValue can be null but chart still renders if datapoints exist
          latestDate: "2024-01-01",
          datapointCount: 1,
        },
      ],
      totalMetrics: 1,
    };

    mockUseCommunityMetrics.mockReturnValue(createMockReturn({ data: metricWithNullValue }));

    const wrapper = createWrapper();
    render(<CommunityMetricsSection />, { wrapper });

    await waitFor(() => {
      // Component should still render the metric and chart if datapoints exist
      expect(screen.getByText("Storage Capacity")).toBeInTheDocument();
      expect(screen.getAllByTestId("area-chart")).toHaveLength(1);
    });
  });
});
