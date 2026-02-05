import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  useProgramFinancials,
  useProgramFinancialsSummary,
} from "@/hooks/financials/useProgramFinancials";
import { getProgramFinancials } from "@/services/financialsService";
import type { ProgramFinancialsResponse } from "@/types/financials";
import { QUERY_KEYS } from "@/utilities/queryKeys";

jest.mock("@/services/financialsService");

const mockGetProgramFinancials = getProgramFinancials as jest.MockedFunction<
  typeof getProgramFinancials
>;

const mockFinancialsResponse: ProgramFinancialsResponse = {
  summary: {
    programId: "program-123",
    programName: "Test Program",
    primaryCurrency: "USD",
    primaryTokenAddress: null,
    primaryChainID: 1,
    totalAllocated: "100000",
    totalDisbursed: "50000",
    totalRemaining: "50000",
    projectCount: 5,
  },
  projects: [
    {
      projectUID: "project-1",
      projectName: "Project One",
      projectSlug: "project-one",
      logoUrl: null,
      grantUID: "grant-1",
      currency: "USD",
      tokenAddress: null,
      chainID: 1,
      approved: "20000",
      disbursed: "10000",
      remaining: "10000",
      disbursementPercentage: 50,
      disbursementStatus: "PARTIAL",
      milestoneCompletion: 75,
    },
  ],
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

describe("useProgramFinancials hooks", () => {
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
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("QUERY_KEYS.FINANCIALS", () => {
    it("should generate correct query keys", () => {
      expect(QUERY_KEYS.FINANCIALS.PROGRAM("program-123")).toEqual([
        "program-financials",
        "program-123",
      ]);
    });
  });

  describe("useProgramFinancials", () => {
    it("should fetch financials when programId is provided", async () => {
      mockGetProgramFinancials.mockResolvedValue(mockFinancialsResponse);

      const { result } = renderHook(() => useProgramFinancials("program-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetProgramFinancials).toHaveBeenCalledWith("program-123", 1, 10);
      expect(result.current.data?.pages[0]).toEqual(mockFinancialsResponse);
    });

    it("should not fetch when programId is null", () => {
      const { result } = renderHook(() => useProgramFinancials(null), {
        wrapper,
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetProgramFinancials).not.toHaveBeenCalled();
    });

    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(() => useProgramFinancials("program-123", { enabled: false }), {
        wrapper,
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetProgramFinancials).not.toHaveBeenCalled();
    });

    it("should respect custom limit option", async () => {
      mockGetProgramFinancials.mockResolvedValue(mockFinancialsResponse);

      const { result } = renderHook(() => useProgramFinancials("program-123", { limit: 20 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetProgramFinancials).toHaveBeenCalledWith("program-123", 1, 20);
    });

    it("should handle pagination correctly", async () => {
      const page1Response: ProgramFinancialsResponse = {
        ...mockFinancialsResponse,
        pagination: {
          ...mockFinancialsResponse.pagination,
          hasNextPage: true,
          nextPage: 2,
        },
      };

      const page2Response: ProgramFinancialsResponse = {
        ...mockFinancialsResponse,
        pagination: {
          ...mockFinancialsResponse.pagination,
          page: 2,
          hasNextPage: false,
          hasPrevPage: true,
          prevPage: 1,
        },
      };

      mockGetProgramFinancials
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const { result } = renderHook(() => useProgramFinancials("program-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasNextPage).toBe(true);

      // Fetch next page
      await result.current.fetchNextPage();

      await waitFor(() => {
        expect(result.current.data?.pages.length).toBe(2);
      });

      expect(mockGetProgramFinancials).toHaveBeenCalledTimes(2);
      expect(mockGetProgramFinancials).toHaveBeenLastCalledWith("program-123", 2, 10);
    });

    it("should handle errors", async () => {
      mockGetProgramFinancials.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useProgramFinancials("program-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Network error");
    });
  });

  describe("useProgramFinancialsSummary", () => {
    it("should fetch summary data", async () => {
      mockGetProgramFinancials.mockResolvedValue(mockFinancialsResponse);

      const { result } = renderHook(() => useProgramFinancialsSummary("program-123"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetProgramFinancials).toHaveBeenCalledWith("program-123", 1, 1);
      expect(result.current.data?.summary).toEqual(mockFinancialsResponse.summary);
    });

    it("should not fetch when programId is null", () => {
      const { result } = renderHook(() => useProgramFinancialsSummary(null), {
        wrapper,
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetProgramFinancials).not.toHaveBeenCalled();
    });

    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(
        () => useProgramFinancialsSummary("program-123", { enabled: false }),
        { wrapper }
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetProgramFinancials).not.toHaveBeenCalled();
    });
  });
});
