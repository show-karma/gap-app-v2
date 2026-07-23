/**
 * @file Tests for project.service
 * @description Tests project fetch behavior and error reporting
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

// Mock the typed api client
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { errorManager } from "@/components/Utilities/errorManager";
import { getProject } from "@/services/project.service";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockApiGet = api.get as vi.MockedFunction<typeof api.get>;
const mockErrorManager = errorManager as vi.MockedFunction<typeof errorManager>;

describe("project.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProject", () => {
    it("should return project data on success", async () => {
      const mockProject = {
        uid: "project-1",
        slug: "project-slug",
      } as any;

      mockApiGet.mockResolvedValueOnce(mockProject);

      const result = await getProject("project-slug");

      expect(result).toEqual(mockProject);
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("project-slug"));
    });

    it("should return null without reporting on 404", async () => {
      mockApiGet.mockRejectedValueOnce(
        new HttpError(404, {
          endpoint: "/v2/projects/unknown",
          method: "GET",
          body: { message: "Project with slug unknown not found" },
        })
      );

      const result = await getProject("unknown");

      expect(result).toBeNull();
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should report non-404 errors", async () => {
      const error = new HttpError(500, {
        endpoint: "/v2/projects/project-slug",
        method: "GET",
        body: { message: "Server error" },
      });
      mockApiGet.mockRejectedValueOnce(error);

      const result = await getProject("project-slug");

      expect(result).toBeNull();
      expect(mockErrorManager).toHaveBeenCalledWith(
        expect.stringContaining("Project API Error:"),
        error,
        {
          context: "project.service",
        }
      );
    });
  });
});
