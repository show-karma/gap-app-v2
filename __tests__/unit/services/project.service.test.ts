/**
 * @file Tests for project.service
 * @description Tests project fetch behavior and error reporting
 */

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

// Mock fetchData utility
jest.mock("@/utilities/fetchData");

import { errorManager } from "@/components/Utilities/errorManager";
import { getProject } from "@/services/project.service";
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;
const mockErrorManager = errorManager as jest.MockedFunction<typeof errorManager>;

describe("project.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProject", () => {
    it("should return project data on success", async () => {
      const mockProject = {
        uid: "project-1",
        slug: "project-slug",
      } as any;

      mockFetchData.mockResolvedValueOnce([mockProject, null, null, 200]);

      const result = await getProject("project-slug");

      expect(result).toEqual(mockProject);
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("project-slug"));
    });

    it("should return null without reporting on 404", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Project with slug unknown not found", null, 404]);

      const result = await getProject("unknown");

      expect(result).toBeNull();
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should report non-404 errors", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Server error", null, 500]);

      const result = await getProject("project-slug");

      expect(result).toBeNull();
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Project API Error: Server error",
        "Server error",
        {
          context: "project.service",
        }
      );
    });
  });
});
