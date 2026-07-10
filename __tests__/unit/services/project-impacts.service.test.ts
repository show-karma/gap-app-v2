/**
 * @file Tests for project-impacts.service
 * @description Tests the project impacts API service, including the
 * GAP-FRONTEND-24Z regression: a 404 from the impacts endpoint must be
 * treated as an expected empty result, not reported to Sentry.
 */

import type { ProjectImpact } from "@/services/project-impacts.service";

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
// Import the service AFTER all mocks are set up
import { getProjectImpacts } from "@/services/project-impacts.service";
// Import the mocked module to get access to the mock function
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as ReturnType<typeof vi.fn>;
const mockErrorManager = errorManager as ReturnType<typeof vi.fn>;

describe("project-impacts.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProjectImpacts", () => {
    const mockImpacts: ProjectImpact[] = [
      {
        uid: "0xImpact1",
        refUID: "0xRef1",
        chainID: 10,
        data: {
          work: "Did the work",
          impact: "Had the impact",
          proof: "https://proof.example",
          startDate: 1700000000,
          endDate: 1700100000,
        },
        verified: [],
      },
    ];

    it("should return the impacts array on success", async () => {
      mockFetchData.mockResolvedValueOnce([mockImpacts, null, null, 200]);

      const result = await getProjectImpacts("test-project");

      expect(result).toEqual(mockImpacts);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("regression GAP-FRONTEND-24Z: returns [] and does NOT report to Sentry on 404", async () => {
      mockFetchData.mockResolvedValueOnce([
        null,
        "Route GET:/projects/test-project/impacts not found",
        null,
        404,
      ]);

      const result = await getProjectImpacts("test-project");

      expect(result).toEqual([]);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("reports genuinely unexpected errors (5xx) to Sentry", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Internal Server Error", null, 500]);

      const result = await getProjectImpacts("test-project");

      expect(result).toEqual([]);
      expect(mockErrorManager).toHaveBeenCalledTimes(1);
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Project Impacts API Error: Internal Server Error",
        "Internal Server Error",
        {
          context: "project-impacts.service",
        }
      );
    });

    it("returns [] when the V1 endpoint responds 200 with a null body (unknown slug)", async () => {
      mockFetchData.mockResolvedValueOnce([null as unknown as ProjectImpact[], null, null, 200]);

      const result = await getProjectImpacts("unknown-slug");

      expect(result).toEqual([]);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("calls the V1 impacts endpoint (locks the wire contract)", async () => {
      mockFetchData.mockResolvedValueOnce([mockImpacts, null, null, 200]);

      await getProjectImpacts("my-project-slug");

      expect(mockFetchData.mock.calls[0][0]).toBe("/projects/my-project-slug/impacts");
    });

    it("forwards isAuthorized and signal positionally", async () => {
      mockFetchData.mockResolvedValueOnce([mockImpacts, null, null, 200]);
      const controller = new AbortController();

      await getProjectImpacts("test-project", {
        isAuthorized: false,
        signal: controller.signal,
      });

      const call = mockFetchData.mock.calls[0];
      expect(call[5]).toBe(false);
      expect(call[8]).toBe(controller.signal);
    });
  });
});
