/**
 * @file Tests for project-search.service
 * @description Tests the V2 project search API service
 */

import type { AxiosInstance } from "axios";
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

// Create a persistent mock instance using var (hoisted) so it's available in jest.mock factory
var mockAxiosInstance: jest.Mocked<AxiosInstance>;

// Mock api-client - the factory runs at hoist time, so we initialize the mock here
jest.mock("@/utilities/auth/api-client", () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    },
    defaults: {} as any,
    getUri: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;

  mockAxiosInstance = instance;

  return {
    createAuthenticatedApiClient: jest.fn(() => instance),
  };
});

// Import the service AFTER all mocks are set up
import { searchProjects, searchProjectsV2 } from "@/services/project-search.service";

describe("project-search.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosInstance.get.mockClear();
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
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it("should return empty array for empty query", async () => {
      const result = await searchProjects("");

      expect(result).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it("should return projects for valid queries", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProjects });

      const result = await searchProjects("test");

      expect(result).toEqual(mockProjects);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(expect.stringContaining("test"));
    });

    it("should include limit parameter when provided", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProjects });

      await searchProjects("test", 5);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(expect.stringContaining("limit=5"));
    });

    it("should return empty array on 404", async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 404 } });

      const result = await searchProjects("nonexistent");

      expect(result).toEqual([]);
    });

    it("should throw on non-404 errors", async () => {
      const error = { response: { status: 500 } };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(searchProjects("test")).rejects.toEqual(error);
    });

    it("should encode special characters in query", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });

      await searchProjects("test & project");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
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
