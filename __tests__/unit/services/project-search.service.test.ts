/**
 * @file Tests for project-search.service
 * @description Tests the V2 project search API service
 */

import type { ProjectResponse } from "@/types/v2/project";

// Mock environment variables
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Mock errorManager
vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

// Mock the typed api client — the service now uses api.get instead of fetchData directly
vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn() },
}));

// Import the service AFTER all mocks are set up
import { searchProjects, searchProjectsV2 } from "@/services/project-search.service";
// Import the mocked module to get access to the mock function
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockApiGet = api.get as vi.MockedFunction<typeof api.get>;

const httpError = (status: number) =>
  new HttpError(status, { endpoint: "/v2/projects/search", method: "GET" });

describe("project-search.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it("should return empty array for empty query", async () => {
      const result = await searchProjects("");

      expect(result).toEqual([]);
      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it("should return projects for valid queries", async () => {
      mockApiGet.mockResolvedValueOnce(mockProjects);

      const result = await searchProjects("test");

      expect(result).toEqual(mockProjects);
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("test"));
    });

    it("should include limit parameter when provided", async () => {
      mockApiGet.mockResolvedValueOnce(mockProjects);

      await searchProjects("test", 5);

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("limit=5"));
    });

    it("should return empty array on error", async () => {
      mockApiGet.mockRejectedValueOnce(httpError(404));

      const result = await searchProjects("nonexistent");

      expect(result).toEqual([]);
    });

    it("should return empty array on API error", async () => {
      mockApiGet.mockRejectedValueOnce(httpError(500));

      const result = await searchProjects("test");

      expect(result).toEqual([]);
    });

    it("should encode special characters in query", async () => {
      mockApiGet.mockResolvedValueOnce([]);

      await searchProjects("test & project");

      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("test & project"))
      );
    });

    it("should unwrap paginated envelope { payload, pagination }", async () => {
      mockApiGet.mockResolvedValueOnce({
        payload: mockProjects,
        pagination: { total: 2, page: 1, limit: 10 },
      });

      const result = await searchProjects("test");

      expect(result).toEqual(mockProjects);
    });

    it("should return empty array when response has unexpected shape", async () => {
      mockApiGet.mockResolvedValueOnce({ unexpected: "shape" });

      const result = await searchProjects("test");

      expect(result).toEqual([]);
    });
  });

  describe("searchProjectsV2 alias", () => {
    it("should be an alias for searchProjects", () => {
      expect(searchProjectsV2).toBe(searchProjects);
    });
  });
});
