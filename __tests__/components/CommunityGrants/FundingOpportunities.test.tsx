import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FundingOpportunities } from "@/components/CommunityGrants/FundingOpportunities";
import { useFundingOpportunities } from "@/hooks/useFundingOpportunities";
import type { FundingProgram } from "@/src/features/funding-map/types/funding-program";

// Mock the hook
jest.mock("@/hooks/useFundingOpportunities");

// Mock InfiniteScroll
jest.mock("react-infinite-scroll-component", () => {
  return ({ children, loader, hasMore, next, dataLength }: any) => (
    <div data-testid="infinite-scroll" data-has-more={hasMore} data-length={dataLength}>
      {children}
      {hasMore && (
        <button type="button" data-testid="load-more" onClick={next}>
          Load More
        </button>
      )}
    </div>
  );
});

// Mock sub-components
jest.mock("@/components/CommunityGrants/FundingOpportunities/FundingOpportunitiesGrid", () => ({
  FundingOpportunitiesGrid: ({ programs }: { programs: FundingProgram[] }) => (
    <div data-testid="funding-opportunities-grid">
      {programs.map((program) => (
        <div key={program._id} data-testid="program-card">
          {program.name}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/components/CommunityGrants/FundingOpportunities/AlreadyAppliedBanner", () => ({
  AlreadyAppliedBanner: ({ communitySlug }: { communitySlug: string }) => (
    <div data-testid="already-applied-banner">Already applied? - {communitySlug}</div>
  ),
}));

// Mock Spinner
jest.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Coins: (props: any) => <svg {...props} data-testid="coins-icon" />,
}));

const mockUseFundingOpportunities = useFundingOpportunities as jest.MockedFunction<
  typeof useFundingOpportunities
>;

describe("FundingOpportunities", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const createMockProgram = (overrides: Partial<FundingProgram> = {}): FundingProgram =>
    ({
      _id: "program-123",
      programId: "program-123",
      name: "Test Program",
      description: "Test program description",
      status: "Active",
      chainId: 1,
      chainName: "Ethereum",
      organizationName: "Test Org",
      communityName: "Test Community",
      ...overrides,
    }) as FundingProgram;

  const defaultHookReturn = {
    data: undefined,
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    error: null,
    isError: false,
    refetch: jest.fn(),
    status: "success" as const,
    fetchStatus: "idle" as const,
    isSuccess: true,
    isPending: false,
    isRefetching: false,
    isFetching: false,
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isStale: false,
    isPlaceholderData: false,
    isFetchedAfterMount: true,
    isFetched: true,
    isLoadingError: false,
    isRefetchError: false,
    hasPreviousPage: false,
    isFetchingPreviousPage: false,
    fetchPreviousPage: jest.fn(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Loading State", () => {
    it("should show spinner when loading without initial data", () => {
      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
        data: undefined,
      } as any);

      render(<FundingOpportunities communityUid="test-uid" communitySlug="test-community" />, {
        wrapper,
      });

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("should not show spinner when loading with initial data", () => {
      const initialData = {
        programs: [createMockProgram()],
        count: 1,
        totalPages: 1,
      };

      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
        data: undefined,
      } as any);

      render(
        <FundingOpportunities
          communityUid="test-uid"
          communitySlug="test-community"
          initialData={initialData}
        />,
        { wrapper }
      );

      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
      expect(screen.getByTestId("program-card")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no programs exist", () => {
      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        data: {
          pages: [
            {
              programs: [],
              count: 0,
              totalPages: 0,
              currentPage: 1,
              hasNext: false,
              hasPrevious: false,
            },
          ],
          pageParams: [1],
        },
      } as any);

      render(<FundingOpportunities communityUid="test-uid" communitySlug="test-community" />, {
        wrapper,
      });

      expect(screen.getByText("No funding opportunities available")).toBeInTheDocument();
      expect(
        screen.getByText(/There are no active funding programs in this community/)
      ).toBeInTheDocument();
      expect(screen.getByTestId("coins-icon")).toBeInTheDocument();
    });
  });

  describe("Programs Display", () => {
    it("should display programs in grid", () => {
      const mockPrograms = [
        createMockProgram({ _id: "program-1", name: "Program 1" }),
        createMockProgram({ _id: "program-2", name: "Program 2" }),
      ];

      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        data: {
          pages: [
            {
              programs: mockPrograms,
              count: 2,
              totalPages: 1,
              currentPage: 1,
              hasNext: false,
              hasPrevious: false,
            },
          ],
          pageParams: [1],
        },
      } as any);

      render(<FundingOpportunities communityUid="test-uid" communitySlug="test-community" />, {
        wrapper,
      });

      expect(screen.getByTestId("funding-opportunities-grid")).toBeInTheDocument();
      expect(screen.getAllByTestId("program-card")).toHaveLength(2);
      expect(screen.getByText("Program 1")).toBeInTheDocument();
      expect(screen.getByText("Program 2")).toBeInTheDocument();
    });

    it("should display AlreadyAppliedBanner with correct communitySlug", () => {
      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        data: {
          pages: [
            {
              programs: [createMockProgram()],
              count: 1,
              totalPages: 1,
              currentPage: 1,
              hasNext: false,
              hasPrevious: false,
            },
          ],
          pageParams: [1],
        },
      } as any);

      render(<FundingOpportunities communityUid="test-uid" communitySlug="optimism" />, {
        wrapper,
      });

      expect(screen.getByTestId("already-applied-banner")).toBeInTheDocument();
      expect(screen.getByText(/Already applied\? - optimism/)).toBeInTheDocument();
    });
  });

  describe("Infinite Scroll", () => {
    it("should render InfiniteScroll component", () => {
      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        hasNextPage: true,
        data: {
          pages: [
            {
              programs: [createMockProgram()],
              count: 100,
              totalPages: 2,
              currentPage: 1,
              hasNext: true,
              hasPrevious: false,
            },
          ],
          pageParams: [1],
        },
      } as any);

      render(<FundingOpportunities communityUid="test-uid" communitySlug="test-community" />, {
        wrapper,
      });

      expect(screen.getByTestId("infinite-scroll")).toBeInTheDocument();
      expect(screen.getByTestId("infinite-scroll")).toHaveAttribute("data-has-more", "true");
    });

    it("should show load more when hasNextPage is true", () => {
      const mockFetchNextPage = jest.fn();

      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        hasNextPage: true,
        fetchNextPage: mockFetchNextPage,
        data: {
          pages: [
            {
              programs: [createMockProgram()],
              count: 100,
              totalPages: 2,
              currentPage: 1,
              hasNext: true,
              hasPrevious: false,
            },
          ],
          pageParams: [1],
        },
      } as any);

      render(<FundingOpportunities communityUid="test-uid" communitySlug="test-community" />, {
        wrapper,
      });

      expect(screen.getByTestId("load-more")).toBeInTheDocument();
    });

    it("should not show load more when hasNextPage is false", () => {
      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        hasNextPage: false,
        data: {
          pages: [
            {
              programs: [createMockProgram()],
              count: 1,
              totalPages: 1,
              currentPage: 1,
              hasNext: false,
              hasPrevious: false,
            },
          ],
          pageParams: [1],
        },
      } as any);

      render(<FundingOpportunities communityUid="test-uid" communitySlug="test-community" />, {
        wrapper,
      });

      expect(screen.queryByTestId("load-more")).not.toBeInTheDocument();
    });

    it("should flatten programs from multiple pages", () => {
      const page1Programs = [createMockProgram({ _id: "program-1", name: "Program 1" })];
      const page2Programs = [createMockProgram({ _id: "program-2", name: "Program 2" })];

      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        hasNextPage: false,
        data: {
          pages: [
            {
              programs: page1Programs,
              count: 2,
              totalPages: 2,
              currentPage: 1,
              hasNext: true,
              hasPrevious: false,
            },
            {
              programs: page2Programs,
              count: 2,
              totalPages: 2,
              currentPage: 2,
              hasNext: false,
              hasPrevious: true,
            },
          ],
          pageParams: [1, 2],
        },
      } as any);

      render(<FundingOpportunities communityUid="test-uid" communitySlug="test-community" />, {
        wrapper,
      });

      expect(screen.getAllByTestId("program-card")).toHaveLength(2);
      expect(screen.getByText("Program 1")).toBeInTheDocument();
      expect(screen.getByText("Program 2")).toBeInTheDocument();
    });
  });

  describe("Initial Data Fallback", () => {
    it("should use initial data when hook data is not available", () => {
      const initialData = {
        programs: [createMockProgram({ _id: "initial-1", name: "Initial Program" })],
        count: 1,
        totalPages: 1,
      };

      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        data: undefined,
      } as any);

      render(
        <FundingOpportunities
          communityUid="test-uid"
          communitySlug="test-community"
          initialData={initialData}
        />,
        { wrapper }
      );

      expect(screen.getByText("Initial Program")).toBeInTheDocument();
    });

    it("should prefer hook data over initial data when available", () => {
      const initialData = {
        programs: [createMockProgram({ _id: "initial-1", name: "Initial Program" })],
        count: 1,
        totalPages: 1,
      };

      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        data: {
          pages: [
            {
              programs: [createMockProgram({ _id: "hook-1", name: "Hook Program" })],
              count: 1,
              totalPages: 1,
              currentPage: 1,
              hasNext: false,
              hasPrevious: false,
            },
          ],
          pageParams: [1],
        },
      } as any);

      render(
        <FundingOpportunities
          communityUid="test-uid"
          communitySlug="test-community"
          initialData={initialData}
        />,
        { wrapper }
      );

      expect(screen.getByText("Hook Program")).toBeInTheDocument();
      expect(screen.queryByText("Initial Program")).not.toBeInTheDocument();
    });
  });

  describe("Hook Invocation", () => {
    it("should call useFundingOpportunities with correct communityUid", () => {
      mockUseFundingOpportunities.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
        data: {
          pages: [
            {
              programs: [],
              count: 0,
              totalPages: 0,
              currentPage: 1,
              hasNext: false,
              hasPrevious: false,
            },
          ],
          pageParams: [1],
        },
      } as any);

      render(<FundingOpportunities communityUid="my-community-uid" communitySlug="my-slug" />, {
        wrapper,
      });

      expect(mockUseFundingOpportunities).toHaveBeenCalledWith({
        communityUid: "my-community-uid",
      });
    });
  });
});
