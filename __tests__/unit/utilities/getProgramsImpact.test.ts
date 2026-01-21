/**
 * @file Tests for getProgramsImpact utility function
 * @description Tests for fetching program impact data from the API
 */

import { errorManager } from "@/components/Utilities/errorManager";
import type { ProgramImpactData } from "@/types/programs";
import fetchData from "@/utilities/fetchData";
import { getProgramsImpact } from "@/utilities/registry/getProgramsImpact";

jest.mock("@/utilities/fetchData");
jest.mock("@/components/Utilities/errorManager");
jest.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      V2: {
        IMPACT: jest.fn((communityId: string) => `/v2/communities/${communityId}/impact`),
      },
    },
  },
}));

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;
const mockErrorManager = errorManager as jest.MockedFunction<typeof errorManager>;

describe("getProgramsImpact", () => {
  const emptyFallbackResponse: ProgramImpactData = {
    data: [],
    stats: {
      totalCategories: 0,
      totalProjects: 0,
      totalFundingAllocated: undefined,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("successful API response", () => {
    const mockApiResponse = {
      stats: {
        totalCategories: 3,
        totalProjects: 15,
        totalFundingAllocated: "1000000",
      },
      categories: [
        {
          categoryName: "Infrastructure",
          impacts: [
            {
              name: "Network Uptime",
              id: "impact-1",
              description: "Measures network availability",
              type: "output" as const,
              indicatorIds: ["indicator-1", "indicator-2"],
            },
            {
              name: "User Growth",
              id: "impact-2",
              description: "Tracks user adoption",
              type: "outcome" as const,
              indicatorIds: ["indicator-3"],
            },
          ],
        },
        {
          categoryName: "Developer Tools",
          impacts: [
            {
              name: "SDK Downloads",
              id: "impact-3",
              description: "Number of SDK downloads",
              type: "output" as const,
              indicatorIds: [],
            },
          ],
        },
      ],
    };

    it("should fetch program impact data successfully", async () => {
      mockFetchData.mockResolvedValue([mockApiResponse, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      expect(mockFetchData).toHaveBeenCalledWith("/v2/communities/test-community/impact");
      expect(result.stats.totalCategories).toBe(3);
      expect(result.stats.totalProjects).toBe(15);
      expect(result.stats.totalFundingAllocated).toBe("1000000");
    });

    it("should transform categories correctly", async () => {
      mockFetchData.mockResolvedValue([mockApiResponse, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      expect(result.data).toHaveLength(2);
      expect(result.data[0].categoryName).toBe("Infrastructure");
      expect(result.data[1].categoryName).toBe("Developer Tools");
    });

    it("should transform impacts correctly with all fields mapped", async () => {
      mockFetchData.mockResolvedValue([mockApiResponse, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      const firstImpact = result.data[0].impacts[0];
      expect(firstImpact.categoryName).toBe("Infrastructure");
      expect(firstImpact.impactSegmentName).toBe("Network Uptime");
      expect(firstImpact.impactSegmentId).toBe("impact-1");
      expect(firstImpact.impactSegmentDescription).toBe("Measures network availability");
      expect(firstImpact.impactSegmentType).toBe("output");
      expect(firstImpact.impactIndicatorIds).toEqual(["indicator-1", "indicator-2"]);
      expect(firstImpact.indicators).toEqual([]);
    });

    it("should handle multiple impacts within a category", async () => {
      mockFetchData.mockResolvedValue([mockApiResponse, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      expect(result.data[0].impacts).toHaveLength(2);
      expect(result.data[0].impacts[1].impactSegmentName).toBe("User Growth");
      expect(result.data[0].impacts[1].impactSegmentType).toBe("outcome");
    });

    it("should handle empty indicator IDs array", async () => {
      mockFetchData.mockResolvedValue([mockApiResponse, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      const developerToolsImpact = result.data[1].impacts[0];
      expect(developerToolsImpact.impactIndicatorIds).toEqual([]);
    });

    it("should handle undefined totalFundingAllocated in response", async () => {
      const responseWithNoFunding = {
        ...mockApiResponse,
        stats: {
          ...mockApiResponse.stats,
          totalFundingAllocated: null,
        },
      };
      mockFetchData.mockResolvedValue([responseWithNoFunding, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      expect(result.stats.totalFundingAllocated).toBeUndefined();
    });

    it("should handle empty string totalFundingAllocated", async () => {
      const responseWithEmptyFunding = {
        ...mockApiResponse,
        stats: {
          ...mockApiResponse.stats,
          totalFundingAllocated: "",
        },
      };
      mockFetchData.mockResolvedValue([responseWithEmptyFunding, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      // Empty string is falsy, so it becomes undefined
      expect(result.stats.totalFundingAllocated).toBeUndefined();
    });

    it("should handle empty categories array", async () => {
      const responseWithNoCategories = {
        stats: {
          totalCategories: 0,
          totalProjects: 0,
          totalFundingAllocated: undefined,
        },
        categories: [],
      };
      mockFetchData.mockResolvedValue([responseWithNoCategories, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      expect(result.data).toEqual([]);
      expect(result.stats.totalCategories).toBe(0);
    });
  });

  describe("API error handling", () => {
    it("should return fallback response when API returns an error", async () => {
      const error = new Error("Server Error");
      mockFetchData.mockResolvedValue([null, error, null, 500]);

      const result = await getProgramsImpact("test-community");

      expect(result).toEqual(emptyFallbackResponse);
      expect(console.warn).toHaveBeenCalledWith("Impact fetch error:", error);
    });

    it("should return fallback response when API returns null data", async () => {
      mockFetchData.mockResolvedValue([null, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      expect(result).toEqual(emptyFallbackResponse);
    });

    it("should return fallback response when API returns undefined data", async () => {
      mockFetchData.mockResolvedValue([undefined, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      expect(result).toEqual(emptyFallbackResponse);
    });

    it("should handle 404 errors gracefully", async () => {
      mockFetchData.mockResolvedValue([null, "Not Found", null, 404]);

      const result = await getProgramsImpact("nonexistent-community");

      expect(result).toEqual(emptyFallbackResponse);
      expect(console.warn).toHaveBeenCalledWith("Impact fetch error:", "Not Found");
    });

    it("should not call errorManager for API errors (handled via fallback)", async () => {
      mockFetchData.mockResolvedValue([null, "API Error", null, 500]);

      await getProgramsImpact("test-community");

      // errorManager is only called in catch block for exceptions
      expect(mockErrorManager).not.toHaveBeenCalled();
    });
  });

  describe("exception handling", () => {
    it("should return fallback response when fetchData throws an exception", async () => {
      const error = new Error("Network error");
      mockFetchData.mockRejectedValue(error);

      const result = await getProgramsImpact("test-community");

      expect(result).toEqual(emptyFallbackResponse);
      expect(console.error).toHaveBeenCalledWith("Error fetching program impact:", error);
    });

    it("should call errorManager when an exception is thrown", async () => {
      const error = new Error("Unexpected error");
      mockFetchData.mockRejectedValue(error);

      await getProgramsImpact("test-community");

      expect(mockErrorManager).toHaveBeenCalledWith("Error fetching program impact", error);
    });

    it("should handle non-Error exceptions", async () => {
      const error = "String error message";
      mockFetchData.mockRejectedValue(error);

      const result = await getProgramsImpact("test-community");

      expect(result).toEqual(emptyFallbackResponse);
      expect(console.error).toHaveBeenCalledWith("Error fetching program impact:", error);
      expect(mockErrorManager).toHaveBeenCalledWith("Error fetching program impact", error);
    });
  });

  describe("edge cases", () => {
    it("should handle category with empty impacts array", async () => {
      const responseWithEmptyImpacts = {
        stats: {
          totalCategories: 1,
          totalProjects: 5,
          totalFundingAllocated: "500000",
        },
        categories: [
          {
            categoryName: "Empty Category",
            impacts: [],
          },
        ],
      };
      mockFetchData.mockResolvedValue([responseWithEmptyImpacts, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      expect(result.data).toHaveLength(1);
      expect(result.data[0].categoryName).toBe("Empty Category");
      expect(result.data[0].impacts).toEqual([]);
    });

    it("should handle special characters in community ID", async () => {
      const mockResponse = {
        stats: { totalCategories: 0, totalProjects: 0, totalFundingAllocated: undefined },
        categories: [],
      };
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      await getProgramsImpact("community-with-special-chars_123");

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/communities/community-with-special-chars_123/impact"
      );
    });

    it("should preserve impact segment type as output or outcome", async () => {
      const responseWithBothTypes = {
        stats: { totalCategories: 1, totalProjects: 1, totalFundingAllocated: undefined },
        categories: [
          {
            categoryName: "Mixed",
            impacts: [
              { name: "Output Impact", id: "1", description: "", type: "output", indicatorIds: [] },
              {
                name: "Outcome Impact",
                id: "2",
                description: "",
                type: "outcome",
                indicatorIds: [],
              },
            ],
          },
        ],
      };
      mockFetchData.mockResolvedValue([responseWithBothTypes, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      expect(result.data[0].impacts[0].impactSegmentType).toBe("output");
      expect(result.data[0].impacts[1].impactSegmentType).toBe("outcome");
    });

    it("should always initialize indicators as empty array", async () => {
      const mockResponse = {
        stats: { totalCategories: 1, totalProjects: 1, totalFundingAllocated: undefined },
        categories: [
          {
            categoryName: "Test",
            impacts: [
              {
                name: "Test Impact",
                id: "1",
                description: "Desc",
                type: "output",
                indicatorIds: ["id-1"],
              },
            ],
          },
        ],
      };
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await getProgramsImpact("test-community");

      // The function always sets indicators to empty array
      expect(result.data[0].impacts[0].indicators).toEqual([]);
      // But indicatorIds should be populated
      expect(result.data[0].impacts[0].impactIndicatorIds).toEqual(["id-1"]);
    });
  });
});
