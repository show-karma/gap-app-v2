import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CommunityPageNavigator } from "@/components/Pages/Communities/CommunityPageNavigator";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";

// Mock hooks
jest.mock("@/hooks/communities/useCommunityDetails");

// Mock next/navigation
const mockUseParams = jest.fn();
const mockUsePathname = jest.fn();
const mockUseSearchParams = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

// Mock PAGES utility
jest.mock("@/utilities/pages", () => ({
  PAGES: {
    COMMUNITY: {
      FUNDING_OPPORTUNITIES: (id: string) => `/community/${id}/funding-opportunities`,
      ALL_GRANTS: (id: string) => `/community/${id}`,
      UPDATES: (id: string) => `/community/${id}/updates`,
      IMPACT: (id: string) => `/community/${id}/impact`,
    },
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  ChartLine: (props: any) => <svg data-testid="chart-line-icon" {...props} />,
  Coins: (props: any) => <svg data-testid="coins-icon" {...props} />,
  LandPlot: (props: any) => <svg data-testid="land-plot-icon" {...props} />,
  SquareUser: (props: any) => <svg data-testid="square-user-icon" {...props} />,
}));

const mockUseCommunityDetails = useCommunityDetails as jest.MockedFunction<
  typeof useCommunityDetails
>;

describe("CommunityPageNavigator", () => {
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

    // Default mocks
    mockUseParams.mockReturnValue({ communityId: "test-community" });
    mockUsePathname.mockReturnValue("/community/test-community");
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => null),
    });
    mockUseCommunityDetails.mockReturnValue({
      data: {
        details: {
          name: "Test Community",
        },
      },
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Rendering", () => {
    it("should render all navigation items", () => {
      render(<CommunityPageNavigator />, { wrapper });

      expect(screen.getByText("Funding opportunities")).toBeInTheDocument();
      expect(screen.getByText(/View.*community projects/)).toBeInTheDocument();
      expect(screen.getByText("Milestone updates")).toBeInTheDocument();
      expect(screen.getByText("Impact")).toBeInTheDocument();
    });

    it("should render all icons", () => {
      render(<CommunityPageNavigator />, { wrapper });

      expect(screen.getByTestId("coins-icon")).toBeInTheDocument();
      expect(screen.getByTestId("square-user-icon")).toBeInTheDocument();
      expect(screen.getByTestId("land-plot-icon")).toBeInTheDocument();
      expect(screen.getByTestId("chart-line-icon")).toBeInTheDocument();
    });

    it("should render links with correct hrefs", () => {
      render(<CommunityPageNavigator />, { wrapper });

      const fundingLink = screen.getByText("Funding opportunities").closest("a");
      const grantsLink = screen.getByText(/View.*community projects/).closest("a");
      const updatesLink = screen.getByText("Milestone updates").closest("a");
      const impactLink = screen.getByText("Impact").closest("a");

      expect(fundingLink).toHaveAttribute(
        "href",
        "/community/test-community/funding-opportunities"
      );
      expect(grantsLink).toHaveAttribute("href", "/community/test-community");
      expect(updatesLink).toHaveAttribute("href", "/community/test-community/updates");
      expect(impactLink).toHaveAttribute("href", "/community/test-community/impact");
    });
  });

  describe("Active State", () => {
    it("should apply active styles to funding opportunities link", () => {
      mockUsePathname.mockReturnValue("/community/test-community/funding-opportunities");

      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText("Funding opportunities").closest("a");
      expect(link?.className).toContain("text-gray-900");
      expect(link?.className).toContain("border-b-4");
      expect(link?.className).toContain("border-b-gray-900");
    });

    it("should apply active styles to community projects link when on main page", () => {
      mockUsePathname.mockReturnValue("/community/test-community");

      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText(/View.*community projects/).closest("a");
      expect(link?.className).toContain("text-gray-900");
    });

    it("should apply active styles to updates link", () => {
      mockUsePathname.mockReturnValue("/community/test-community/updates");

      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText("Milestone updates").closest("a");
      expect(link?.className).toContain("text-gray-900");
    });

    it("should apply active styles to impact link", () => {
      mockUsePathname.mockReturnValue("/community/test-community/impact");

      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText("Impact").closest("a");
      expect(link?.className).toContain("text-gray-900");
    });

    it("should apply inactive styles to non-active links", () => {
      mockUsePathname.mockReturnValue("/community/test-community/funding-opportunities");

      render(<CommunityPageNavigator />, { wrapper });

      const impactLink = screen.getByText("Impact").closest("a");
      expect(impactLink?.className).toContain("text-gray-500");
      expect(impactLink?.className).toContain("border-b-transparent");
    });
  });

  describe("Admin Page", () => {
    it("should return null when on admin page", () => {
      mockUsePathname.mockReturnValue("/community/test-community/admin");

      const { container } = render(<CommunityPageNavigator />, { wrapper });

      expect(container.firstChild).toBeNull();
    });

    it("should return null when on admin subpage", () => {
      mockUsePathname.mockReturnValue("/community/test-community/admin/project/milestones");

      const { container } = render(<CommunityPageNavigator />, { wrapper });

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Community Name", () => {
    it("should include community name in projects link text", () => {
      mockUseCommunityDetails.mockReturnValue({
        data: {
          details: {
            name: "Optimism",
          },
        },
        isLoading: false,
      } as any);

      render(<CommunityPageNavigator />, { wrapper });

      expect(screen.getByText("View Optimism community projects")).toBeInTheDocument();
    });

    it("should handle missing community name gracefully", () => {
      mockUseCommunityDetails.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      render(<CommunityPageNavigator />, { wrapper });

      // When community name is empty, it renders with double space
      const link = screen.getByTestId("square-user-icon").closest("a");
      expect(link?.textContent).toContain("community projects");
    });
  });

  describe("Program ID", () => {
    it("should append programId to links when present", () => {
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === "programId" ? "program-123" : null),
      });

      render(<CommunityPageNavigator />, { wrapper });

      const fundingLink = screen.getByText("Funding opportunities").closest("a");
      expect(fundingLink).toHaveAttribute(
        "href",
        "/community/test-community/funding-opportunities?programId=program-123"
      );

      const impactLink = screen.getByText("Impact").closest("a");
      expect(impactLink).toHaveAttribute(
        "href",
        "/community/test-community/impact?programId=program-123"
      );
    });

    it("should not append programId when not present", () => {
      mockUseSearchParams.mockReturnValue({
        get: () => null,
      });

      render(<CommunityPageNavigator />, { wrapper });

      const fundingLink = screen.getByText("Funding opportunities").closest("a");
      expect(fundingLink).toHaveAttribute(
        "href",
        "/community/test-community/funding-opportunities"
      );
    });
  });

  describe("Styling", () => {
    it("should have container with correct classes", () => {
      const { container } = render(<CommunityPageNavigator />, { wrapper });

      const nav = container.firstChild;
      expect(nav).toHaveClass("flex");
      expect(nav).toHaveClass("flex-row");
      expect(nav).toHaveClass("pt-8");
      expect(nav).toHaveClass("border-b");
    });

    it("should have links with gap between icon and text", () => {
      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText("Funding opportunities").closest("a");
      expect(link?.className).toContain("gap-3");
    });

    it("should have icons with correct size", () => {
      render(<CommunityPageNavigator />, { wrapper });

      const icon = screen.getByTestId("coins-icon");
      expect(icon).toHaveClass("w-6");
      expect(icon).toHaveClass("h-6");
    });

    it("should have dark mode classes on container", () => {
      const { container } = render(<CommunityPageNavigator />, { wrapper });

      const nav = container.firstChild;
      expect(nav).toHaveClass("dark:border-zinc-700");
    });

    it("should have dark mode classes on links", () => {
      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText("Funding opportunities").closest("a");
      // Inactive links have dark:text-zinc-400
      expect(link?.className).toContain("dark:text-zinc-400");
    });
  });

  describe("isActive Logic", () => {
    it("should mark funding opportunities as active when path includes /funding-opportunities", () => {
      mockUsePathname.mockReturnValue("/community/test-community/funding-opportunities");

      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText("Funding opportunities").closest("a");
      expect(link?.className).toContain("text-gray-900");
    });

    it("should mark community projects as active when on main page (not impact, updates, donate, funding-opportunities, or project-discovery)", () => {
      mockUsePathname.mockReturnValue("/community/test-community");

      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText(/View.*community projects/).closest("a");
      expect(link?.className).toContain("text-gray-900");
    });

    it("should not mark community projects as active on impact page", () => {
      mockUsePathname.mockReturnValue("/community/test-community/impact");

      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText(/View.*community projects/).closest("a");
      expect(link?.className).toContain("text-gray-500");
    });

    it("should not mark community projects as active on updates page", () => {
      mockUsePathname.mockReturnValue("/community/test-community/updates");

      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText(/View.*community projects/).closest("a");
      expect(link?.className).toContain("text-gray-500");
    });
  });

  describe("Transition Effects", () => {
    it("should have transition classes on links", () => {
      render(<CommunityPageNavigator />, { wrapper });

      const link = screen.getByText("Funding opportunities").closest("a");
      expect(link?.className).toContain("transition-colors");
      expect(link?.className).toContain("duration-200");
    });

    it("should have transition classes on icons", () => {
      render(<CommunityPageNavigator />, { wrapper });

      const icon = screen.getByTestId("coins-icon");
      expect(icon).toHaveClass("transition-colors");
      expect(icon).toHaveClass("duration-200");
    });
  });
});
