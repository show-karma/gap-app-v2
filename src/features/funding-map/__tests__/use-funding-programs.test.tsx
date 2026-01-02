import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FUNDING_MAP_DEFAULT_CHAIN_ID } from "../constants/filter-options";
import {
  fundingProgramsKeys,
  useFundingProgram,
  useFundingProgramByCompositeId,
  useFundingPrograms,
} from "../hooks/use-funding-programs";
import { fundingProgramsService } from "../services/funding-programs.service";
import type { FundingProgramResponse } from "../types/funding-program";

// Mock the service
jest.mock("../services/funding-programs.service");

const mockService = fundingProgramsService as jest.Mocked<typeof fundingProgramsService>;

describe("useFundingPrograms hooks", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const createMockProgram = (
    overrides: Partial<FundingProgramResponse> = {}
  ): FundingProgramResponse => ({
    _id: { $oid: "test-id-123" },
    programId: "program-1",
    chainID: 10,
    isValid: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    metadata: {
      title: "Test Program",
      description: "Test description",
      status: "active",
      categories: ["DeFi"],
      ecosystems: ["Optimism"],
      networks: ["Ethereum"],
      grantTypes: ["Direct Funding"],
    },
    ...overrides,
  });

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

  describe("fundingProgramsKeys", () => {
    it("should create correct all key", () => {
      expect(fundingProgramsKeys.all).toEqual(["fundingPrograms"]);
    });

    it("should create correct lists key", () => {
      expect(fundingProgramsKeys.lists()).toEqual(["fundingPrograms", "list"]);
    });

    it("should create correct list key with params", () => {
      const params = { page: 1, search: "test" };
      expect(fundingProgramsKeys.list(params)).toEqual(["fundingPrograms", "list", params]);
    });

    it("should create correct details key", () => {
      expect(fundingProgramsKeys.details()).toEqual(["fundingPrograms", "detail"]);
    });

    it("should create correct detail key with programId and chainId", () => {
      expect(fundingProgramsKeys.detail("program-1", 10)).toEqual([
        "fundingPrograms",
        "detail",
        "program-1",
        10,
      ]);
    });
  });

  describe("useFundingPrograms", () => {
    it("should fetch programs with default parameters", async () => {
      const mockPrograms = [createMockProgram()];
      mockService.getAll.mockResolvedValue({
        programs: mockPrograms,
        count: 1,
        totalPages: 1,
      });

      const { result } = renderHook(() => useFundingPrograms(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getAll).toHaveBeenCalledWith({});
      expect(result.current.data?.programs).toEqual(mockPrograms);
      expect(result.current.data?.count).toBe(1);
    });

    it("should pass filter parameters to service", async () => {
      mockService.getAll.mockResolvedValue({
        programs: [],
        count: 0,
        totalPages: 0,
      });

      const params = {
        page: 2,
        pageSize: 10,
        search: "optimism",
        status: "active",
        categories: ["DeFi"],
      };

      const { result } = renderHook(() => useFundingPrograms(params), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getAll).toHaveBeenCalledWith(params);
    });

    it("should handle loading state", async () => {
      mockService.getAll.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ programs: [], count: 0, totalPages: 0 }), 100)
          )
      );

      const { result } = renderHook(() => useFundingPrograms(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle error state", async () => {
      mockService.getAll.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useFundingPrograms(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should return correct totalPages from V2 response", async () => {
      mockService.getAll.mockResolvedValue({
        programs: [createMockProgram()],
        count: 50,
        totalPages: 5,
      });

      const { result } = renderHook(() => useFundingPrograms(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.totalPages).toBe(5);
    });
  });

  describe("useFundingProgram", () => {
    it("should fetch single program by ID and chainId", async () => {
      const mockProgram = createMockProgram();
      mockService.getById.mockResolvedValue(mockProgram);

      const { result } = renderHook(() => useFundingProgram("program-1", 10), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getById).toHaveBeenCalledWith("program-1", 10);
      expect(result.current.data).toEqual(mockProgram);
    });

    it("should use default chainId when not provided", async () => {
      const mockProgram = createMockProgram();
      mockService.getById.mockResolvedValue(mockProgram);

      const { result } = renderHook(() => useFundingProgram("program-1"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getById).toHaveBeenCalledWith("program-1", FUNDING_MAP_DEFAULT_CHAIN_ID);
    });

    it("should not fetch when programId is null", () => {
      const { result } = renderHook(() => useFundingProgram(null), { wrapper });

      expect(mockService.getById).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle program not found", async () => {
      mockService.getById.mockResolvedValue(null);

      const { result } = renderHook(() => useFundingProgram("nonexistent", 10), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it("should handle error when fetching program", async () => {
      mockService.getById.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useFundingProgram("program-1", 10), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useFundingProgramByCompositeId", () => {
    it("should parse composite ID and fetch program", async () => {
      const mockProgram = createMockProgram();
      mockService.getById.mockResolvedValue(mockProgram);
      mockService.parseProgramIdAndChainId.mockReturnValue({
        programId: "program-1",
        chainId: 10,
      });

      const { result } = renderHook(() => useFundingProgramByCompositeId("program-1_10"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.parseProgramIdAndChainId).toHaveBeenCalledWith("program-1_10");
      expect(mockService.getById).toHaveBeenCalledWith("program-1", 10);
      expect(result.current.data).toEqual(mockProgram);
    });

    it("should handle composite ID without chainId", async () => {
      const mockProgram = createMockProgram();
      mockService.getById.mockResolvedValue(mockProgram);
      mockService.parseProgramIdAndChainId.mockReturnValue({
        programId: "program-1",
        chainId: FUNDING_MAP_DEFAULT_CHAIN_ID,
      });

      const { result } = renderHook(() => useFundingProgramByCompositeId("program-1"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getById).toHaveBeenCalledWith("program-1", FUNDING_MAP_DEFAULT_CHAIN_ID);
    });

    it("should not fetch when compositeId is null", () => {
      const { result } = renderHook(() => useFundingProgramByCompositeId(null), {
        wrapper,
      });

      expect(mockService.getById).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle various chain IDs in composite ID", async () => {
      const testCases = [
        { compositeId: "prog_1", expectedChainId: 1 },
        { compositeId: "prog_137", expectedChainId: 137 },
        { compositeId: "prog_42161", expectedChainId: 42161 },
      ];

      for (const { compositeId, expectedChainId } of testCases) {
        queryClient.clear();
        jest.clearAllMocks();

        mockService.getById.mockResolvedValue(createMockProgram());
        mockService.parseProgramIdAndChainId.mockReturnValue({
          programId: "prog",
          chainId: expectedChainId,
        });

        const { result } = renderHook(() => useFundingProgramByCompositeId(compositeId), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(mockService.getById).toHaveBeenCalledWith("prog", expectedChainId);
      }
    });
  });

  describe("Cache management", () => {
    it("should use staleTime for caching", async () => {
      const mockPrograms = [createMockProgram()];
      mockService.getAll.mockResolvedValue({
        programs: mockPrograms,
        count: 1,
        totalPages: 1,
      });

      const { result, rerender } = renderHook(() => useFundingPrograms(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First call
      expect(mockService.getAll).toHaveBeenCalledTimes(1);

      // Rerender - should use cache
      rerender();

      // Still only one call due to caching
      expect(mockService.getAll).toHaveBeenCalledTimes(1);
    });
  });
});
