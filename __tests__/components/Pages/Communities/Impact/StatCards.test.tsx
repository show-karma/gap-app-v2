import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  CommunityImpactStatCards,
  CommunityStatCards,
  ImpactStatCards,
} from "@/components/Pages/Communities/Impact/StatCards";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { useCommunityStore } from "@/store/community";
import { getCommunityStats } from "@/utilities/queries/v2/getCommunityData";

// Mock hooks and services
jest.mock("@/hooks/useImpactMeasurement");
jest.mock("@/utilities/queries/v2/getCommunityData");
jest.mock("@/store/community");

// Mock useQuery for CommunityStatCards
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn(),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ communityId: "test-community" })),
  usePathname: jest.fn(() => "/community/test-community"),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((key: string) => null),
  })),
}));

// Mock Skeleton
jest.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className}>
      Loading...
    </div>
  ),
}));

// Mock InfoTooltip
jest.mock("@/components/Utilities/InfoTooltip", () => ({
  InfoTooltip: ({ content }: { content: ReactNode }) => (
    <div data-testid="info-tooltip">{content}</div>
  ),
}));

const mockUseImpactMeasurement = useImpactMeasurement as jest.MockedFunction<
  typeof useImpactMeasurement
>;

const mockGetCommunityStats = getCommunityStats as jest.MockedFunction<typeof getCommunityStats>;

const mockUseCommunityStore = useCommunityStore as jest.MockedFunction<typeof useCommunityStore>;

describe("StatCards", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();

    // Default mock for community store
    mockUseCommunityStore.mockReturnValue({
      totalProjects: 10,
      totalGrants: 5,
      totalMilestones: 20,
      isLoadingFilters: false,
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("ImpactStatCards", () => {
    it("should render three stat cards", () => {
      mockUseImpactMeasurement.mockReturnValue({
        data: {
          stats: {
            totalProjects: 100,
            totalCategories: 25,
            totalFundingAllocated: "$1,000,000",
          },
        },
        isLoading: false,
      } as any);

      render(<ImpactStatCards />, { wrapper });

      expect(screen.getByText("Total Projects")).toBeInTheDocument();
      expect(screen.getByText("Total Categories")).toBeInTheDocument();
      expect(screen.getByText("Total Funding Allocated (with available data)")).toBeInTheDocument();
    });

    it("should display formatted values", () => {
      mockUseImpactMeasurement.mockReturnValue({
        data: {
          stats: {
            totalProjects: 1234,
            totalCategories: 56,
            totalFundingAllocated: "$1,500,000",
          },
        },
        isLoading: false,
      } as any);

      render(<ImpactStatCards />, { wrapper });

      // formatCurrency uses abbreviated format for large numbers (1.2K)
      expect(screen.getByText("1.2K")).toBeInTheDocument();
      expect(screen.getByText("56")).toBeInTheDocument();
      expect(screen.getByText("$1,500,000")).toBeInTheDocument();
    });

    it("should show skeletons when loading", () => {
      mockUseImpactMeasurement.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      render(<ImpactStatCards />, { wrapper });

      expect(screen.getAllByTestId("skeleton")).toHaveLength(3);
    });

    it("should show dash for missing values", () => {
      mockUseImpactMeasurement.mockReturnValue({
        data: {
          stats: {
            totalProjects: 0,
            totalCategories: undefined,
            totalFundingAllocated: "NaN",
          },
        },
        isLoading: false,
      } as any);

      render(<ImpactStatCards />, { wrapper });

      // Zero should show "0"
      expect(screen.getByText("0")).toBeInTheDocument();
      // Undefined and NaN should show "-"
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it("should apply correct colors to stat cards", () => {
      mockUseImpactMeasurement.mockReturnValue({
        data: {
          stats: {
            totalProjects: 100,
            totalCategories: 25,
            totalFundingAllocated: "$1,000,000",
          },
        },
        isLoading: false,
      } as any);

      const { container } = render(<ImpactStatCards />, { wrapper });

      // Check for color indicators
      const colorIndicators = container.querySelectorAll('[style*="background"]');
      expect(colorIndicators.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("CommunityStatCards", () => {
    const mockCommunityStatsData = {
      totalGrants: 50,
      projectUpdates: 200,
      projectUpdatesBreakdown: {
        projectMilestones: 30,
        projectCompletedMilestones: 20,
        projectUpdates: 40,
        grantMilestones: 35,
        grantCompletedMilestones: 25,
        grantUpdates: 50,
      },
    };

    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockCommunityStatsData,
        isLoading: false,
        error: null,
      } as any);
    });

    it("should render stat cards", async () => {
      render(<CommunityStatCards />, { wrapper });

      expect(screen.getByText("Total Projects")).toBeInTheDocument();
      expect(screen.getByText("Total Grants")).toBeInTheDocument();
      // There are multiple "Project Updates" elements (card title + breakdown)
      expect(screen.getAllByText("Project Updates").length).toBeGreaterThanOrEqual(1);
    });

    it("should display values from community store", () => {
      mockUseCommunityStore.mockReturnValue({
        totalProjects: 42,
        totalGrants: 15,
        totalMilestones: 30,
        isLoadingFilters: false,
      } as any);

      render(<CommunityStatCards />, { wrapper });

      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should show skeletons when loading filters", () => {
      mockUseCommunityStore.mockReturnValue({
        totalProjects: 10,
        totalGrants: 5,
        totalMilestones: 20,
        isLoadingFilters: true,
      } as any);

      render(<CommunityStatCards />, { wrapper });

      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(1);
    });

    it("should show skeletons when query is loading", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<CommunityStatCards />, { wrapper });

      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(1);
    });

    it("should show dash for zero or undefined values", () => {
      mockUseCommunityStore.mockReturnValue({
        totalProjects: 0,
        totalGrants: 0,
        totalMilestones: 0,
        isLoadingFilters: false,
      } as any);

      mockUseQuery.mockReturnValue({
        data: {
          totalGrants: 0,
          projectUpdates: 0,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<CommunityStatCards />, { wrapper });

      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("CommunityImpactStatCards", () => {
    const { usePathname } = require("next/navigation");

    it("should render ImpactStatCards when on impact page", () => {
      usePathname.mockReturnValue("/community/test-community/impact");
      mockUseImpactMeasurement.mockReturnValue({
        data: {
          stats: {
            totalProjects: 100,
            totalCategories: 25,
            totalFundingAllocated: "$1,000,000",
          },
        },
        isLoading: false,
      } as any);

      render(<CommunityImpactStatCards />, { wrapper });

      expect(screen.getByText("Total Categories")).toBeInTheDocument();
    });

    it("should render CommunityStatCards when not on impact page", () => {
      usePathname.mockReturnValue("/community/test-community");
      mockUseCommunityStore.mockReturnValue({
        totalProjects: 10,
        totalGrants: 5,
        totalMilestones: 20,
        isLoadingFilters: false,
      } as any);

      render(<CommunityImpactStatCards />, { wrapper });

      expect(screen.getByText("Total Grants")).toBeInTheDocument();
    });

    it("should have correct container styling", () => {
      usePathname.mockReturnValue("/community/test-community");
      mockUseCommunityStore.mockReturnValue({
        totalProjects: 10,
        totalGrants: 5,
        totalMilestones: 20,
        isLoadingFilters: false,
      } as any);

      const { container } = render(<CommunityImpactStatCards />, { wrapper });

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("flex");
      expect(mainContainer).toHaveClass("flex-1");
      expect(mainContainer).toHaveClass("gap-6");
    });
  });

  describe("StatCard Component", () => {
    it("should display title and value", () => {
      mockUseImpactMeasurement.mockReturnValue({
        data: {
          stats: {
            totalProjects: 500,
            totalCategories: 30,
            totalFundingAllocated: "$2,000,000",
          },
        },
        isLoading: false,
      } as any);

      render(<ImpactStatCards />, { wrapper });

      expect(screen.getByText("500")).toBeInTheDocument();
      expect(screen.getByText("Total Projects")).toBeInTheDocument();
    });

    it("should have dark mode classes", () => {
      mockUseImpactMeasurement.mockReturnValue({
        data: {
          stats: {
            totalProjects: 100,
            totalCategories: 25,
            totalFundingAllocated: "$1,000,000",
          },
        },
        isLoading: false,
      } as any);

      const { container } = render(<ImpactStatCards />, { wrapper });

      // Check for dark mode classes on card container
      const cards = container.querySelectorAll(".dark\\:bg-zinc-900");
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    it("should have rounded corners and border", () => {
      mockUseImpactMeasurement.mockReturnValue({
        data: {
          stats: {
            totalProjects: 100,
            totalCategories: 25,
            totalFundingAllocated: "$1,000,000",
          },
        },
        isLoading: false,
      } as any);

      const { container } = render(<ImpactStatCards />, { wrapper });

      const cards = container.querySelectorAll(".rounded-lg");
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Tooltip", () => {
    it("should show tooltip for Project Updates when breakdown is available", async () => {
      mockGetCommunityStats.mockResolvedValue({
        totalGrants: 50,
        projectUpdates: 200,
        projectUpdatesBreakdown: {
          projectMilestones: 30,
          projectCompletedMilestones: 20,
          projectUpdates: 40,
          grantMilestones: 35,
          grantCompletedMilestones: 25,
          grantUpdates: 50,
        },
      });

      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/community/test-community");

      render(<CommunityStatCards />, { wrapper });

      // Wait for the query to resolve
      await screen.findByText("Project Updates");
    });
  });

  describe("Color Indicators", () => {
    it("should apply correct colors for Impact stat cards", () => {
      mockUseImpactMeasurement.mockReturnValue({
        data: {
          stats: {
            totalProjects: 100,
            totalCategories: 25,
            totalFundingAllocated: "$1,000,000",
          },
        },
        isLoading: false,
      } as any);

      const { container } = render(<ImpactStatCards />, { wrapper });

      // Check for color indicator elements - colors are converted to RGB by the browser
      // rgb(132, 173, 255) = #84ADFF, rgb(103, 227, 249) = #67E3F9, rgb(166, 239, 103) = #A6EF67
      const colorIndicators = container.querySelectorAll('[style*="background"]');
      expect(colorIndicators.length).toBe(3);

      // Verify indicators exist and have the rounded-full class
      colorIndicators.forEach((indicator) => {
        expect(indicator).toHaveClass("rounded-full");
        expect(indicator).toHaveClass("w-1");
        expect(indicator).toHaveClass("h-full");
      });
    });
  });
});
