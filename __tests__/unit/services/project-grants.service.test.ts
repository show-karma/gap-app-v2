/**
 * @file Tests for project-grants.service
 * @description Tests the V2 project grants API service
 */

import type { AxiosInstance } from "axios";
import type { GrantResponse } from "@/types/v2/grant";

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
import { getProjectGrants } from "@/services/project-grants.service";

describe("project-grants.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosInstance.get.mockClear();
  });

  describe("getProjectGrants", () => {
    const mockGrants: GrantResponse[] = [
      {
        uid: "0xgrant1",
        chainID: 10,
        details: {
          title: "Test Grant 1",
          description: "Description 1",
        },
        milestones: [],
        updates: [],
      },
      {
        uid: "0xgrant2",
        chainID: 10,
        details: {
          title: "Test Grant 2",
          description: "Description 2",
        },
        milestones: [],
        updates: [],
      },
    ];

    it("should return grants array when API returns array", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockGrants });

      const result = await getProjectGrants("test-project");

      expect(result).toEqual(mockGrants);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(expect.stringContaining("test-project"));
    });

    it("should return array with single grant when API returns single object", async () => {
      const singleGrant = mockGrants[0];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: singleGrant });

      const result = await getProjectGrants("test-project");

      expect(result).toEqual([singleGrant]);
    });

    it("should return empty array when API returns null", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: null });

      const result = await getProjectGrants("test-project");

      expect(result).toEqual([]);
    });

    it("should return empty array on 404", async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 404 } });

      const result = await getProjectGrants("nonexistent-project");

      expect(result).toEqual([]);
    });

    it("should return empty array on other errors", async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 500 } });

      const result = await getProjectGrants("test-project");

      expect(result).toEqual([]);
    });

    it("should call correct endpoint for project slug", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockGrants });

      await getProjectGrants("my-project-slug");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining("my-project-slug")
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(expect.stringContaining("/grants"));
    });

    it("should call correct endpoint for project UID", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockGrants });

      await getProjectGrants("0x1234567890");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(expect.stringContaining("0x1234567890"));
    });
  });
});
