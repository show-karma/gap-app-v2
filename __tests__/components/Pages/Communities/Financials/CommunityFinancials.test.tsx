import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { CommunityFinancials } from "@/components/Pages/Communities/Financials";
import { useProgramFinancials, useSelectedProgram } from "@/hooks/financials/useProgramFinancials";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import type { ProgramFinancialsResponse } from "@/types/financials";

// Mock hooks
jest.mock("@/hooks/financials/useProgramFinancials");
jest.mock("@/hooks/usePrograms");

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ communityId: "test-community" })),
}));

// Mock child components to simplify testing
jest.mock("@/components/Pages/Communities/Financials/ProgramSelector", () => ({
  ProgramSelector: () => <div data-testid="program-selector">Program Selector</div>,
}));

jest.mock("@/components/Pages/Communities/Financials/FinancialsSummary", () => ({
  FinancialsSummary: ({ summary, isLoading }: { summary: any; isLoading: boolean }) => (
    <div data-testid="financials-summary" data-loading={isLoading}>
      {summary ? "Summary loaded" : "No summary"}
    </div>
  ),
}));

jest.mock("@/components/Pages/Communities/Financials/ProjectFinancialsList", () => ({
  ProjectFinancialsList: ({
    data,
    isLoading,
    hasNextPage,
  }: {
    data: any;
    isLoading: boolean;
    hasNextPage: boolean;
  }) => (
    <div data-testid="projects-list" data-loading={isLoading} data-has-next={hasNextPage}>
      {data ? "Projects loaded" : "No projects"}
    </div>
  ),
}));

const mockUseCommunityPrograms = useCommunityPrograms as jest.MockedFunction<
  typeof useCommunityPrograms
>;
const mockUseSelectedProgram = useSelectedProgram as jest.MockedFunction<typeof useSelectedProgram>;
const mockUseProgramFinancials = useProgramFinancials as jest.MockedFunction<
  typeof useProgramFinancials
>;

const mockPrograms = [
  { programId: "program-1", metadata: { title: "Program One" } },
  { programId: "program-2", metadata: { title: "Program Two" } },
];

const mockFinancialsResponse: ProgramFinancialsResponse = {
  summary: {
    programId: "program-1",
    programName: "Program One",
    primaryCurrency: "USD",
    primaryTokenAddress: null,
    primaryChainID: 1,
    totalAllocated: "100000",
    totalDisbursed: "50000",
    totalRemaining: "50000",
    projectCount: 5,
  },
  projects: [],
  pagination: {
    totalCount: 5,
    page: 1,
    limit: 10,
    totalPages: 1,
    nextPage: null,
    prevPage: null,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

describe("CommunityFinancials", () => {
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
    mockUseCommunityPrograms.mockReturnValue({
      data: mockPrograms,
      isLoading: false,
    } as any);

    mockUseSelectedProgram.mockReturnValue(["program-1", jest.fn()] as any);

    mockUseProgramFinancials.mockReturnValue({
      data: { pages: [mockFinancialsResponse] },
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("should render header with title and description", () => {
    render(<CommunityFinancials />, { wrapper });

    expect(screen.getByText("Financials")).toBeInTheDocument();
    expect(
      screen.getByText("Track funding allocation and disbursement status across projects")
    ).toBeInTheDocument();
  });

  it("should render program selector when programs exist", () => {
    render(<CommunityFinancials />, { wrapper });

    expect(screen.getByTestId("program-selector")).toBeInTheDocument();
  });

  it("should show loading spinner when programs are loading", () => {
    mockUseCommunityPrograms.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = render(<CommunityFinancials />, { wrapper });

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should show empty state when no programs exist", () => {
    mockUseCommunityPrograms.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<CommunityFinancials />, { wrapper });

    expect(screen.getByTestId("financials-no-programs")).toBeInTheDocument();
  });

  it("should show select program state when no program selected", () => {
    mockUseSelectedProgram.mockReturnValue(["", jest.fn()] as any);

    render(<CommunityFinancials />, { wrapper });

    expect(screen.getByTestId("financials-select-program")).toBeInTheDocument();
  });

  it("should render summary and projects list when program is selected", () => {
    render(<CommunityFinancials />, { wrapper });

    expect(screen.getByTestId("financials-summary")).toBeInTheDocument();
    expect(screen.getByTestId("projects-list")).toBeInTheDocument();
  });

  it("should pass loading state to child components", () => {
    mockUseProgramFinancials.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
    } as any);

    render(<CommunityFinancials />, { wrapper });

    expect(screen.getByTestId("financials-summary")).toHaveAttribute("data-loading", "true");
    expect(screen.getByTestId("projects-list")).toHaveAttribute("data-loading", "true");
  });

  it("should have correct test id", () => {
    render(<CommunityFinancials />, { wrapper });

    expect(screen.getByTestId("community-financials")).toBeInTheDocument();
  });
});
