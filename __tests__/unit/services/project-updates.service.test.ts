/**
 * @file Tests for project-updates.service
 * @description Tests project updates fetch behavior and error reporting
 */

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

// Mock the unified api client
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
import { getProjectUpdates } from "@/services/project-updates.service";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockApiGet = api.get as vi.Mock;
const mockErrorManager = errorManager as vi.MockedFunction<typeof errorManager>;

describe("project-updates.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProjectUpdates", () => {
    const emptyResponse = {
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [],
      grantUpdates: [],
    };

    it("should return updates data on success", async () => {
      const mockResponse = {
        projectUpdates: [{ uid: "update-1" }],
        projectMilestones: [],
        grantMilestones: [],
        grantUpdates: [],
      } as any;

      mockApiGet.mockResolvedValueOnce(mockResponse);

      const result = await getProjectUpdates("project-slug");

      expect(result).toEqual(mockResponse);
      expect(mockApiGet.mock.calls[0][0]).toEqual(expect.stringContaining("project-slug"));
    });

    it("should append milestoneStatus query param when provided", async () => {
      mockApiGet.mockResolvedValueOnce({
        projectUpdates: [],
        projectMilestones: [],
        grantMilestones: [],
        grantUpdates: [],
      });

      await getProjectUpdates("project-slug", "completed");

      expect(mockApiGet.mock.calls[0][0]).toEqual(
        expect.stringContaining("milestoneStatus=completed")
      );
    });

    it("should not append milestoneStatus when not provided", async () => {
      mockApiGet.mockResolvedValueOnce({
        projectUpdates: [],
        projectMilestones: [],
        grantMilestones: [],
        grantUpdates: [],
      });

      await getProjectUpdates("project-slug");

      expect(mockApiGet.mock.calls[0][0]).toEqual(expect.not.stringContaining("milestoneStatus"));
    });

    it("should return empty response without reporting on 404", async () => {
      mockApiGet.mockRejectedValueOnce(
        new HttpError(404, {
          endpoint: "/v2/projects/unknown/updates",
          method: "GET",
          body: { message: "Project with identifier unknown not found" },
        })
      );

      const result = await getProjectUpdates("unknown");

      expect(result).toEqual(emptyResponse);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should report non-404 errors", async () => {
      mockApiGet.mockRejectedValueOnce(
        new HttpError(500, {
          endpoint: "/v2/projects/project-slug/updates",
          method: "GET",
          body: { message: "Server error" },
        })
      );

      const result = await getProjectUpdates("project-slug");

      expect(result).toEqual(emptyResponse);
      expect(mockErrorManager).toHaveBeenCalledWith(
        expect.stringContaining("Project Updates API Error:"),
        expect.any(HttpError),
        {
          context: "project-updates.service",
        }
      );
    });
  });
});
