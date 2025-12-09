/**
 * @file Tests for project-search.service
 * @description Tests the V2 project search API service
 */

import type { ProjectResponse } from "@/types/v2/project";

// Mock environment variables
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Mock errorManager
jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

// Mock fetchData utility - the service now uses fetchData instead of api-client directly
jest.mock("@/utilities/fetchData");

// Import the service AFTER all mocks are set up
import { searchProjects, searchProjectsV2 } from "@/services/project-search.service";
// Import the mocked module to get access to the mock function
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

describe("project-search.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchProjects", () => {
    const mockProjects: ProjectResponse[] = [
      {
        uid: "0xproject1" as `0x${string}`,
        chainID: 10,
        owner: "0xowner1" as `0x${string}`,
        details: {
          title: "Test Project 1",
          description: "Description 1",
          slug: "test-project-1",
        },
        members: [],
        grants: [],
      },
      {
        uid: "0xproject2" as `0x${string}`,
        chainID: 10,
        owner: "0xowner2" as `0x${string}`,
        details: {
          title: "Test Project 2",
          description: "Description 2",
          slug: "test-project-2",
        },
        members: [],
        grants: [],
      },
    ];

    it("should return empty array for queries shorter than 3 characters", async () => {
      const result = await searchProjects("ab");

      expect(result).toEqual([]);
      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it("should return empty array for empty query", async () => {
      const result = await searchProjects("");

      expect(result).toEqual([]);
      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it("should return projects for valid queries", async () => {
      mockFetchData.mockResolvedValueOnce([mockProjects, null, null, 200]);

      const result = await searchProjects("test");

      expect(result).toEqual(mockProjects);
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("test"));
    });

    it("should include limit parameter when provided", async () => {
      mockFetchData.mockResolvedValueOnce([mockProjects, null, null, 200]);

      await searchProjects("test", 5);

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("limit=5"));
    });

    it("should return empty array on error", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Not found", null, 404]);

      const result = await searchProjects("nonexistent");

      expect(result).toEqual([]);
    });

    it("should return empty array on API error", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Server error", null, 500]);

      const result = await searchProjects("test");

      expect(result).toEqual([]);
    });

    it("should encode special characters in query", async () => {
      mockFetchData.mockResolvedValueOnce([[], null, null, 200]);

      await searchProjects("test & project");

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("test & project"))
      );
    });
  });

  describe("searchProjectsV2 alias", () => {
    it("should be an alias for searchProjects", () => {
      expect(searchProjectsV2).toBe(searchProjects);
    });
  });
});
