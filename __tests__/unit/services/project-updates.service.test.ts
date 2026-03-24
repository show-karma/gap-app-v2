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

// Mock fetchData utility
vi.mock("@/utilities/fetchData");

import { errorManager } from "@/components/Utilities/errorManager";
import { getProjectUpdates } from "@/services/project-updates.service";
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as vi.MockedFunction<typeof fetchData>;
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

      mockFetchData.mockResolvedValueOnce([mockResponse, null, null, 200]);

      const result = await getProjectUpdates("project-slug");

      expect(result).toEqual(mockResponse);
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("project-slug"));
    });

    it("should return empty response without reporting on 404", async () => {
      mockFetchData.mockResolvedValueOnce([
        null,
        "Project with identifier unknown not found",
        null,
        404,
      ]);

      const result = await getProjectUpdates("unknown");

      expect(result).toEqual(emptyResponse);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should report non-404 errors", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Server error", null, 500]);

      const result = await getProjectUpdates("project-slug");

      expect(result).toEqual(emptyResponse);
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Project Updates API Error: Server error",
        "Server error",
        {
          context: "project-updates.service",
        }
      );
    });
  });
});
