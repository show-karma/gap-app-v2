/**
 * @file Tests for project-impacts.service
 * @description Tests project impacts fetch behavior and error reporting
 */

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/utilities/fetchData");

import { errorManager } from "@/components/Utilities/errorManager";
import { getProjectImpacts } from "@/services/project-impacts.service";
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as vi.MockedFunction<typeof fetchData>;
const mockErrorManager = errorManager as vi.MockedFunction<typeof errorManager>;

describe("project-impacts.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProjectImpacts", () => {
    const mockImpacts = [
      {
        uid: "impact-1",
        refUID: "ref-1",
        chainID: 10,
        data: {
          work: "Ship feature",
          impact: "Helped users",
        },
      },
    ];

    it("should return impacts data on success", async () => {
      mockFetchData.mockResolvedValueOnce([mockImpacts, null, null, 200]);

      const result = await getProjectImpacts("project-slug");

      expect(result).toEqual(mockImpacts);
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("project-slug"));
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("/impacts"));
    });

    it("should return empty array without reporting on 404", async () => {
      mockFetchData.mockResolvedValueOnce([
        null,
        "Project with identifier unknown not found",
        null,
        404,
      ]);

      const result = await getProjectImpacts("unknown");

      expect(result).toEqual([]);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should report non-404 errors", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Server error", null, 500]);

      const result = await getProjectImpacts("project-slug");

      expect(result).toEqual([]);
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Project Impacts API Error: Server error",
        "Server error",
        {
          context: "project-impacts.service",
        }
      );
    });
  });
});
