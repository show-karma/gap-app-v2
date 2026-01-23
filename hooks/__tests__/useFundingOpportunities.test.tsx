import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { fundingProgramsService } from "@/src/features/funding-map/services/funding-programs.service";
import type { FundingProgram } from "@/src/features/funding-map/types/funding-program";
import { useFundingOpportunities } from "../useFundingOpportunities";

// NOTE: @/src/features/funding-map/services/funding-programs.service is globally mocked in tests/bun-setup.ts

const mockGetAll = fundingProgramsService.getAll as jest.MockedFunction<
  typeof fundingProgramsService.getAll
>;

describe("useFundingOpportunities", () => {
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

  describe("successful data fetching", () => {
    it("should fetch funding opportunities for a community", async () => {
      const mockPrograms = [createMockProgram(), createMockProgram({ _id: "program-2" })];
      mockGetAll.mockResolvedValue({
        programs: mockPrograms,
        count: 2,
        totalPages: 1,
      });

      const { result } = renderHook(
        () => useFundingOpportunities({ communityUid: "test-community" }),
        {
          wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAll).toHaveBeenCalledWith({
        communityUid: "test-community",
        onlyOnKarma: true,
        status: "Active",
        page: 1,
        pageSize: 50,
      });
      expect(result.current.data?.pages[0].programs).toEqual(mockPrograms);
    });

    it("should return empty array when no programs exist", async () => {
      mockGetAll.mockResolvedValue({
        programs: [],
        count: 0,
        totalPages: 0,
      });

      const { result } = renderHook(
        () => useFundingOpportunities({ communityUid: "empty-community" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.pages[0].programs).toEqual([]);
    });
  });

  describe("loading state", () => {
    it("should have loading state while fetching", async () => {
      mockGetAll.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  programs: [createMockProgram()],
                  count: 1,
                  totalPages: 1,
                }),
              100
            )
          )
      );

      const { result } = renderHook(
        () => useFundingOpportunities({ communityUid: "test-community" }),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.pages[0].programs).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("should handle fetch errors", async () => {
      mockGetAll.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(
        () => useFundingOpportunities({ communityUid: "test-community" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe("enabled state", () => {
    it("should not fetch when communityUid is empty", () => {
      const { result } = renderHook(() => useFundingOpportunities({ communityUid: "" }), {
        wrapper,
      });

      expect(mockGetAll).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(
        () => useFundingOpportunities({ communityUid: "test-community", enabled: false }),
        { wrapper }
      );

      expect(mockGetAll).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch when communityUid is provided", async () => {
      mockGetAll.mockResolvedValue({
        programs: [createMockProgram()],
        count: 1,
        totalPages: 1,
      });

      const { result } = renderHook(() => useFundingOpportunities({ communityUid: "optimism" }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAll).toHaveBeenCalledWith(
        expect.objectContaining({ communityUid: "optimism" })
      );
    });
  });

  describe("pagination", () => {
    it("should fetch next page when hasNextPage is true", async () => {
      mockGetAll
        .mockResolvedValueOnce({
          programs: [createMockProgram({ _id: "program-1" })],
          count: 100,
          totalPages: 2,
        })
        .mockResolvedValueOnce({
          programs: [createMockProgram({ _id: "program-2" })],
          count: 100,
          totalPages: 2,
        });

      const { result } = renderHook(
        () => useFundingOpportunities({ communityUid: "test-community" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(true);

      // Fetch next page
      await result.current.fetchNextPage();

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(2);
      });

      expect(mockGetAll).toHaveBeenCalledTimes(2);
      expect(mockGetAll).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));
    });

    it("should not have next page when on last page", async () => {
      mockGetAll.mockResolvedValue({
        programs: [createMockProgram()],
        count: 1,
        totalPages: 1,
      });

      const { result } = renderHook(
        () => useFundingOpportunities({ communityUid: "test-community" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(false);
    });

    it("should flatten pages correctly", async () => {
      const page1Programs = [
        createMockProgram({ _id: "program-1" }),
        createMockProgram({ _id: "program-2" }),
      ];
      const page2Programs = [
        createMockProgram({ _id: "program-3" }),
        createMockProgram({ _id: "program-4" }),
      ];

      mockGetAll
        .mockResolvedValueOnce({
          programs: page1Programs,
          count: 4,
          totalPages: 2,
        })
        .mockResolvedValueOnce({
          programs: page2Programs,
          count: 4,
          totalPages: 2,
        });

      const { result } = renderHook(
        () => useFundingOpportunities({ communityUid: "test-community" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Fetch the next page
      result.current.fetchNextPage();

      // Wait for pages to be loaded
      await waitFor(
        () => {
          expect(result.current.data?.pages).toHaveLength(2);
        },
        { timeout: 3000 }
      );

      const allPrograms = result.current.data?.pages.flatMap((page) => page.programs);
      expect(allPrograms).toHaveLength(4);
      expect(allPrograms?.[0]._id).toBe("program-1");
      expect(allPrograms?.[3]._id).toBe("program-4");
    });
  });

  describe("caching", () => {
    it("should use cache on subsequent renders", async () => {
      const mockPrograms = [createMockProgram()];
      mockGetAll.mockResolvedValue({
        programs: mockPrograms,
        count: 1,
        totalPages: 1,
      });

      const { result, rerender } = renderHook(
        () => useFundingOpportunities({ communityUid: "test-community" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAll).toHaveBeenCalledTimes(1);

      // Rerender - should use cache
      rerender();

      expect(mockGetAll).toHaveBeenCalledTimes(1);
      expect(result.current.data?.pages[0].programs).toEqual(mockPrograms);
    });

    it("should fetch again when communityUid changes", async () => {
      mockGetAll.mockResolvedValue({
        programs: [createMockProgram()],
        count: 1,
        totalPages: 1,
      });

      const { result, rerender } = renderHook(
        ({ uid }) => useFundingOpportunities({ communityUid: uid }),
        {
          wrapper,
          initialProps: { uid: "community-1" },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAll).toHaveBeenCalledWith(
        expect.objectContaining({ communityUid: "community-1" })
      );

      // Change community uid
      rerender({ uid: "community-2" });

      await waitFor(() => {
        expect(mockGetAll).toHaveBeenCalledWith(
          expect.objectContaining({ communityUid: "community-2" })
        );
      });

      expect(mockGetAll).toHaveBeenCalledTimes(2);
    });
  });

  describe("query configuration", () => {
    it("should use correct query key structure", async () => {
      mockGetAll.mockResolvedValue({
        programs: [],
        count: 0,
        totalPages: 0,
      });

      const { result } = renderHook(() => useFundingOpportunities({ communityUid: "test-slug" }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify the query is cached with the right key
      const cachedData = queryClient.getQueryData(["funding-opportunities-infinite", "test-slug"]);
      expect(cachedData).toBeDefined();
    });

    it("should request only active programs with onlyOnKarma flag", async () => {
      mockGetAll.mockResolvedValue({
        programs: [],
        count: 0,
        totalPages: 0,
      });

      renderHook(() => useFundingOpportunities({ communityUid: "test-community" }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockGetAll).toHaveBeenCalled();
      });

      expect(mockGetAll).toHaveBeenCalledWith(
        expect.objectContaining({
          onlyOnKarma: true,
          status: "Active",
        })
      );
    });
  });
});
