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
import { getProjectGrants } from "@/services/project-grants.service";

const _mockedAxios = axios as jest.Mocked<typeof axios>;

describe("project-grants.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosInstance.get.mockClear();

    // Mock TokenManager
    (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue("test-token");
  });

  describe("getProjectGrants", () => {
    it("should fetch grants for a project by UID", async () => {
      const mockGrants = [
        {
          uid: "grant-1",
          title: "Test Grant 1",
          programUID: "program-1",
          milestones: [],
        },
        {
          uid: "grant-2",
          title: "Test Grant 2",
          programUID: "program-2",
          milestones: [],
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockGrants });

      const result = await getProjectGrants("project-uid-123");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v2/projects/project-uid-123/grants");
      expect(result).toEqual(mockGrants);
    });

    it("should fetch grants for a project by slug", async () => {
      const mockGrants = [
        {
          uid: "grant-1",
          title: "Test Grant",
          programUID: "program-1",
          milestones: [],
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockGrants });

      const result = await getProjectGrants("my-project-slug");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v2/projects/my-project-slug/grants");
      expect(result).toEqual(mockGrants);
    });

    it("should return empty array when no grants found (array response)", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const result = await getProjectGrants("project-uid-123");

      expect(result).toEqual([]);
    });

    it("should handle single grant object response", async () => {
      const mockGrant = {
        uid: "grant-1",
        title: "Single Grant",
        programUID: "program-1",
        milestones: [],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockGrant });

      const result = await getProjectGrants("project-uid-123");

      expect(result).toEqual([mockGrant]);
    });

    it("should return empty array on 404 error", async () => {
      const error = {
        response: {
          status: 404,
          data: { message: "Not found" },
        },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await getProjectGrants("non-existent-project");

      expect(result).toEqual([]);
    });

    it("should return empty array on other errors to prevent breaking the page", async () => {
      const error = {
        response: {
          status: 500,
          data: { message: "Internal server error" },
        },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await getProjectGrants("project-uid-123");

      expect(result).toEqual([]);
    });

    it("should return empty array on network error", async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error("Network error"));

      const result = await getProjectGrants("project-uid-123");

      expect(result).toEqual([]);
    });

    it("should handle null/undefined data response", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: null });

      const result = await getProjectGrants("project-uid-123");

      expect(result).toEqual([]);
    });
  });
});
