import { act, render, screen, waitFor } from "@testing-library/react";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { useProjectStore } from "@/store";
import { ProjectActivityChart } from "../ProjectActivityChart";

// Mock IntersectionObserver to trigger visibility on observe
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {
    // Immediately trigger the callback synchronously
    this.callback(
      [{ isIntersecting: true, boundingClientRect: { width: 100 } } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
});

jest.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: jest.fn(),
}));

jest.mock("@/store", () => ({
  useProjectStore: jest.fn(),
}));

jest.mock("@tremor/react", () => ({
  AreaChart: jest.fn(({ data, categories }) => (
    <div data-testid="area-chart" data-categories={JSON.stringify(categories)}>
      {JSON.stringify(data)}
    </div>
  )),
  Card: jest.fn(({ children }) => <div data-testid="chart-card">{children}</div>),
}));

describe("ProjectActivityChart", () => {
  const mockProject = { uid: "test-project-uid" };

  beforeEach(() => {
    jest.clearAllMocks();
    (useProjectStore as unknown as jest.Mock).mockReturnValue({ project: mockProject });
  });

  it("should render loading state with skeleton", () => {
    (useProjectProfile as jest.Mock).mockReturnValue({
      allUpdates: [],
      isLoading: true,
    });

    render(<ProjectActivityChart />);

    expect(screen.getByTestId("chart-card")).toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should categorize grant_received as Funding", async () => {
    const mockUpdates = [
      {
        uid: "grant-received-1",
        type: "grant_received",
        createdAt: "2024-01-15T10:00:00.000Z",
        completed: false,
      },
      {
        uid: "grant-received-2",
        type: "grant_received",
        createdAt: "2024-01-20T10:00:00.000Z",
        completed: false,
      },
    ];

    (useProjectProfile as jest.Mock).mockReturnValue({
      allUpdates: mockUpdates,
      isLoading: false,
    });

    await act(async () => {
      render(<ProjectActivityChart />);
    });

    const chart = await waitFor(() => screen.getByTestId("area-chart"));
    const chartData = JSON.parse(chart.textContent || "[]");

    expect(chartData.length).toBeGreaterThan(0);
    expect(chartData[0].Funding).toBe(2);
    expect(chartData[0]["Product updates"]).toBe(0);
  });

  it("should categorize grant and grant_update as Funding", async () => {
    // Use dates within the same week (Feb 12-17, 2024 is Sun-Sat)
    const mockUpdates = [
      {
        uid: "grant-1",
        type: "grant",
        createdAt: "2024-02-12T10:00:00.000Z",
        completed: false,
      },
      {
        uid: "grant-update-1",
        type: "grant_update",
        createdAt: "2024-02-14T10:00:00.000Z",
        completed: false,
      },
    ];

    (useProjectProfile as jest.Mock).mockReturnValue({
      allUpdates: mockUpdates,
      isLoading: false,
    });

    await act(async () => {
      render(<ProjectActivityChart />);
    });

    const chart = await waitFor(() => screen.getByTestId("area-chart"));
    const chartData = JSON.parse(chart.textContent || "[]");

    expect(chartData.length).toBeGreaterThan(0);
    expect(chartData[0].Funding).toBe(2);
    expect(chartData[0]["Product updates"]).toBe(0);
  });

  it("should categorize milestone and update as Product updates", async () => {
    // Use dates within the same week (Mar 10-16, 2024 is Sun-Sat)
    const mockUpdates = [
      {
        uid: "milestone-1",
        type: "milestone",
        createdAt: "2024-03-11T10:00:00.000Z",
        completed: true,
      },
      {
        uid: "update-1",
        type: "update",
        createdAt: "2024-03-13T10:00:00.000Z",
        completed: false,
      },
    ];

    (useProjectProfile as jest.Mock).mockReturnValue({
      allUpdates: mockUpdates,
      isLoading: false,
    });

    await act(async () => {
      render(<ProjectActivityChart />);
    });

    const chart = await waitFor(() => screen.getByTestId("area-chart"));
    const chartData = JSON.parse(chart.textContent || "[]");

    expect(chartData.length).toBeGreaterThan(0);
    expect(chartData[0].Funding).toBe(0);
    expect(chartData[0]["Product updates"]).toBe(2);
  });

  it("should use allUpdates from useProjectProfile which includes grant_received", async () => {
    // Use dates within the same week (Apr 14-20, 2024 is Sun-Sat)
    const mockUpdates = [
      {
        uid: "milestone-1",
        type: "milestone",
        createdAt: "2024-04-15T10:00:00.000Z",
        completed: false,
      },
      {
        uid: "grant-received-1",
        type: "grant_received",
        createdAt: "2024-04-16T10:00:00.000Z",
        completed: false,
      },
      {
        uid: "impact-1",
        type: "impact",
        createdAt: "2024-04-17T10:00:00.000Z",
        completed: false,
      },
    ];

    (useProjectProfile as jest.Mock).mockReturnValue({
      allUpdates: mockUpdates,
      isLoading: false,
    });

    await act(async () => {
      render(<ProjectActivityChart />);
    });

    const chart = await waitFor(() => screen.getByTestId("area-chart"));
    const chartData = JSON.parse(chart.textContent || "[]");

    expect(chartData.length).toBeGreaterThan(0);
    expect(chartData[0].Funding).toBe(1);
    expect(chartData[0]["Product updates"]).toBe(2);
  });

  it("should render without card wrapper when embedded", async () => {
    (useProjectProfile as jest.Mock).mockReturnValue({
      allUpdates: [
        {
          uid: "update-1",
          type: "update",
          createdAt: "2024-05-15T10:00:00.000Z",
          completed: false,
        },
      ],
      isLoading: false,
    });

    await act(async () => {
      render(<ProjectActivityChart embedded />);
    });

    expect(screen.queryByTestId("chart-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });

  it("should render empty state when no data", async () => {
    (useProjectProfile as jest.Mock).mockReturnValue({
      allUpdates: [],
      isLoading: false,
    });

    await act(async () => {
      render(<ProjectActivityChart embedded />);
    });

    expect(screen.getByText("No activity data for this period")).toBeInTheDocument();
  });
});
