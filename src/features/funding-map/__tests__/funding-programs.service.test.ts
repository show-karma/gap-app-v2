import { INDEXER } from "@/utilities/indexer";
import { FUNDING_MAP_DEFAULT_CHAIN_ID, FUNDING_MAP_PAGE_SIZE } from "../constants/filter-options";
import type {
  FundingProgramResponse,
  PaginatedFundingProgramsResponse,
} from "../types/funding-program";

// Mock fetchData
jest.mock("@/utilities/fetchData");

// Import after mock
import fetchData from "@/utilities/fetchData";
import { fundingProgramsService } from "../services/funding-programs.service";

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

describe("fundingProgramsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  const createMockPaginatedResponse = (
    programs: FundingProgramResponse[],
    overrides: Partial<PaginatedFundingProgramsResponse> = {}
  ): PaginatedFundingProgramsResponse => ({
    programs,
    count: programs.length,
    totalPages: 1,
    currentPage: 1,
    hasNext: false,
    hasPrevious: false,
    ...overrides,
  });

  describe("getAll", () => {
    it("should fetch programs with default parameters", async () => {
      const mockPrograms = [createMockProgram()];
      const mockResponse = createMockPaginatedResponse(mockPrograms);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await fundingProgramsService.getAll();

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining(INDEXER.V2.REGISTRY.GET_ALL)
      );
      expect(result.programs).toEqual(mockPrograms);
      expect(result.count).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should use V2 program-registry/search endpoint", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll();

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("/v2/program-registry/search")
      );
    });

    it("should pass page parameter correctly", async () => {
      const mockResponse = createMockPaginatedResponse([], {
        currentPage: 3,
        totalPages: 5,
      });
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll({ page: 3 });

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("page=3"));
    });

    it("should pass pageSize as limit parameter", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll({ pageSize: 20 });

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("limit=20"));
    });

    it("should use default pageSize when not provided", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll();

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining(`limit=${FUNDING_MAP_PAGE_SIZE}`)
      );
    });

    it("should pass search parameter as name", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll({ search: "optimism" });

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("name=optimism"));
    });

    it("should pass status filter", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll({ status: "active" });

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("status=active"));
    });

    it("should pass categories filter", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll({ categories: ["DeFi", "NFT"] });

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("categories="));
    });

    it("should pass ecosystems filter", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll({ ecosystems: ["Optimism"] });

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("ecosystems=Optimism"));
    });

    it("should pass networks filter", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll({ networks: ["Ethereum"] });

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("networks=Ethereum"));
    });

    it("should pass grantTypes filter", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll({ grantTypes: ["Direct Funding"] });

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("grantTypes="));
    });

    it("should use totalPages from V2 response directly", async () => {
      const mockPrograms = [createMockProgram()];
      const mockResponse = createMockPaginatedResponse(mockPrograms, {
        count: 50,
        totalPages: 5,
      });
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await fundingProgramsService.getAll();

      expect(result.totalPages).toBe(5);
      expect(result.count).toBe(50);
    });

    it("should return empty result when response is null", async () => {
      mockFetchData.mockResolvedValue([null, null, null, 200]);

      const result = await fundingProgramsService.getAll();

      expect(result.programs).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it("should throw error when API returns error", async () => {
      mockFetchData.mockResolvedValue([null, "API Error", null, 500]);

      await expect(fundingProgramsService.getAll()).rejects.toThrow("API Error");
    });

    it("should handle multiple filters combined", async () => {
      const mockResponse = createMockPaginatedResponse([]);
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await fundingProgramsService.getAll({
        page: 2,
        pageSize: 10,
        search: "test",
        status: "active",
        categories: ["DeFi"],
        ecosystems: ["Optimism"],
      });

      const calledUrl = mockFetchData.mock.calls[0][0] as string;
      expect(calledUrl).toContain("page=2");
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("name=test");
      expect(calledUrl).toContain("status=active");
      expect(calledUrl).toContain("categories=DeFi");
      expect(calledUrl).toContain("ecosystems=Optimism");
    });
  });

  describe("getById", () => {
    it("should fetch single program by ID", async () => {
      const mockProgram = createMockProgram();
      mockFetchData.mockResolvedValue([mockProgram, null, null, 200]);

      const result = await fundingProgramsService.getById("program-1");

      expect(result).toEqual(mockProgram);
      expect(mockFetchData).toHaveBeenCalledWith(INDEXER.V2.REGISTRY.GET_BY_ID("program-1"));
    });

    it("should use V2 program-registry endpoint for single program", async () => {
      const mockProgram = createMockProgram();
      mockFetchData.mockResolvedValue([mockProgram, null, null, 200]);

      await fundingProgramsService.getById("program-1");

      expect(mockFetchData).toHaveBeenCalledWith("/v2/program-registry/program-1");
    });

    it("should pass composite programId format through to API", async () => {
      // Note: getById passes programId directly - callers should use parseProgramIdAndChainId
      // to extract the normalized programId if they have a composite format
      const mockProgram = createMockProgram();
      mockFetchData.mockResolvedValue([mockProgram, null, null, 200]);

      await fundingProgramsService.getById("program-1_42161");

      expect(mockFetchData).toHaveBeenCalledWith("/v2/program-registry/program-1_42161");
    });

    it("should return null when program not found", async () => {
      mockFetchData.mockResolvedValue([null, "Not found", null, 404]);

      const result = await fundingProgramsService.getById("nonexistent");

      expect(result).toBeNull();
    });

    it("should return null when error occurs", async () => {
      mockFetchData.mockResolvedValue([null, "Server error", null, 500]);

      const result = await fundingProgramsService.getById("program-1");

      expect(result).toBeNull();
    });
  });

  describe("parseProgramIdAndChainId", () => {
    it("should parse simple programId without chainId", () => {
      const result = fundingProgramsService.parseProgramIdAndChainId("program-123");

      expect(result.programId).toBe("program-123");
      expect(result.chainId).toBe(FUNDING_MAP_DEFAULT_CHAIN_ID);
    });

    it("should parse programId with chainId separated by underscore", () => {
      const result = fundingProgramsService.parseProgramIdAndChainId("program-123_10");

      expect(result.programId).toBe("program-123");
      expect(result.chainId).toBe(10);
    });

    it("should use default chainId when parsing fails and keep full programId", () => {
      const result = fundingProgramsService.parseProgramIdAndChainId("program-123_invalid");

      expect(result.programId).toBe("program-123_invalid");
      expect(result.chainId).toBe(FUNDING_MAP_DEFAULT_CHAIN_ID);
    });

    it("should use custom default chainId when provided", () => {
      const result = fundingProgramsService.parseProgramIdAndChainId("program-123", 42161);

      expect(result.programId).toBe("program-123");
      expect(result.chainId).toBe(42161);
    });

    it("should handle programId with multiple underscores by splitting on the last underscore", () => {
      const result = fundingProgramsService.parseProgramIdAndChainId("program_with_underscores_10");

      expect(result.programId).toBe("program_with_underscores");
      expect(result.chainId).toBe(10);
    });

    it("should use default chainId when last segment after underscore is not a valid number", () => {
      const result = fundingProgramsService.parseProgramIdAndChainId(
        "program_with_underscores_invalid"
      );

      expect(result.programId).toBe("program_with_underscores_invalid");
      expect(result.chainId).toBe(FUNDING_MAP_DEFAULT_CHAIN_ID);
    });

    it("should parse various chain IDs correctly", () => {
      const testCases = [
        { input: "prog_1", expectedChainId: 1 },
        { input: "prog_10", expectedChainId: 10 },
        { input: "prog_137", expectedChainId: 137 },
        { input: "prog_42161", expectedChainId: 42161 },
      ];

      testCases.forEach(({ input, expectedChainId }) => {
        const result = fundingProgramsService.parseProgramIdAndChainId(input);
        expect(result.chainId).toBe(expectedChainId);
      });
    });

    it("should handle edge case of just underscore", () => {
      const result = fundingProgramsService.parseProgramIdAndChainId("_10");

      expect(result.programId).toBe("");
      expect(result.chainId).toBe(10);
    });
  });
});
