import axios, { type AxiosInstance } from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";

// Mock dependencies BEFORE importing the service
jest.mock("axios");
jest.mock("@/utilities/auth/token-manager");
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
    deleteUri: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;

  mockAxiosInstance = instance;

  return {
    createAuthenticatedApiClient: jest.fn(() => instance),
  };
});

// Import the service AFTER all mocks are set up
import { searchProjects, searchProjectsV2 } from "@/services/project-search.service";

const _mockedAxios = axios as jest.Mocked<typeof axios>;

describe("project-search.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosInstance.get.mockClear();

    // Mock TokenManager
    (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue("test-token");
  });

  describe("searchProjects", () => {
    it("should search projects with query", async () => {
      const mockProjects = [
        {
          uid: "project-1",
          details: {
            title: "Test Project",
            slug: "test-project",
            description: "A test project",
          },
        },
        {
          uid: "project-2",
          details: {
            title: "Another Test",
            slug: "another-test",
            description: "Another test project",
          },
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockProjects });

      const result = await searchProjects("test");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v2/projects?q=test");
      expect(result).toEqual(mockProjects);
    });

    it("should search projects with query and limit", async () => {
      const mockProjects = [
        {
          uid: "project-1",
          details: {
            title: "Test Project",
            slug: "test-project",
          },
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockProjects });

      const result = await searchProjects("test", 5);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v2/projects?q=test&limit=5");
      expect(result).toEqual(mockProjects);
    });

    it("should return empty array for queries shorter than 3 characters", async () => {
      const result1 = await searchProjects("");
      const result2 = await searchProjects("ab");

      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it("should search with exactly 3 character query", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const result = await searchProjects("abc");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v2/projects?q=abc");
      expect(result).toEqual([]);
    });

    it("should URL encode special characters in query", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await searchProjects("test project");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v2/projects?q=test%20project");
    });

    it("should return empty array on 404 error", async () => {
      const error = {
        response: {
          status: 404,
          data: { message: "Not found" },
        },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await searchProjects("nonexistent");

      expect(result).toEqual([]);
    });

    it("should return empty array on other errors to prevent breaking search", async () => {
      const error = {
        response: {
          status: 500,
          data: { message: "Internal server error" },
        },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await searchProjects("test");

      expect(result).toEqual([]);
    });

    it("should return empty array on network error", async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error("Network error"));

      const result = await searchProjects("test");

      expect(result).toEqual([]);
    });

    it("should return empty array when no results found", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const result = await searchProjects("xyz123nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("searchProjectsV2 alias", () => {
    it("should be an alias for searchProjects", async () => {
      const mockProjects = [
        {
          uid: "project-1",
          details: { title: "Test" },
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockProjects });

      const result = await searchProjectsV2("test");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v2/projects?q=test");
      expect(result).toEqual(mockProjects);
    });
  });
});
