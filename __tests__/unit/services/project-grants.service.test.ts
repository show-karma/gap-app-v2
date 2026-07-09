/**
 * @file Tests for project-grants.service
 * @description Tests the V2 project grants API service
 */

import type { GrantResponse } from "@/types/v2/grant";

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

// Mock the unified api client - the service now uses api.get instead of fetchData
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

import { errorManager } from "@/components/Utilities/errorManager";
// Import the service AFTER all mocks are set up
import { getProjectGrants } from "@/services/project-grants.service";
// Import the mocked module to get access to the mock function
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockApiGet = api.get as vi.Mock;
const mockErrorManager = errorManager as vi.MockedFunction<typeof errorManager>;

describe("project-grants.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      mockApiGet.mockResolvedValueOnce(mockGrants);

      const result = await getProjectGrants("test-project");

      expect(result).toEqual(mockGrants);
      expect(mockApiGet.mock.calls[0][0]).toEqual(expect.stringContaining("test-project"));
    });

    it("should return array with single grant when API returns single object", async () => {
      const singleGrant = mockGrants[0];
      mockApiGet.mockResolvedValueOnce(singleGrant);

      const result = await getProjectGrants("test-project");

      expect(result).toEqual([singleGrant]);
    });

    it("should return empty array when API returns null", async () => {
      mockApiGet.mockRejectedValueOnce(
        new HttpError(404, {
          endpoint: "/v2/projects/test-project/grants",
          method: "GET",
          body: { message: "Not found" },
        })
      );

      const result = await getProjectGrants("test-project");

      expect(result).toEqual([]);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should return empty array on error", async () => {
      mockApiGet.mockRejectedValueOnce(
        new HttpError(404, {
          endpoint: "/v2/projects/nonexistent-project/grants",
          method: "GET",
          body: { message: "Not found" },
        })
      );

      const result = await getProjectGrants("nonexistent-project");

      expect(result).toEqual([]);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should return empty array on API error", async () => {
      mockApiGet.mockRejectedValueOnce(
        new HttpError(500, {
          endpoint: "/v2/projects/test-project/grants",
          method: "GET",
          body: { message: "Server error" },
        })
      );

      const result = await getProjectGrants("test-project");

      expect(result).toEqual([]);
      expect(mockErrorManager).toHaveBeenCalledWith(
        expect.stringContaining("Project Grants API Error:"),
        expect.any(HttpError),
        {
          context: "project-grants.service",
        }
      );
    });

    it("should call correct endpoint for project slug", async () => {
      mockApiGet.mockResolvedValueOnce(mockGrants);

      await getProjectGrants("my-project-slug");

      expect(mockApiGet.mock.calls[0][0]).toEqual(expect.stringContaining("my-project-slug"));
      expect(mockApiGet.mock.calls[0][0]).toEqual(expect.stringContaining("/grants"));
    });

    it("should call correct endpoint for project UID", async () => {
      mockApiGet.mockResolvedValueOnce(mockGrants);

      await getProjectGrants("0x1234567890");

      expect(mockApiGet.mock.calls[0][0]).toEqual(expect.stringContaining("0x1234567890"));
    });
  });
});
