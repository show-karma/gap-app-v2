/**
 * @file Tests for project-impacts.service
 * @description Tests the project impacts API service, including the
 * GAP-FRONTEND-24Z regression: a 404 from the impacts endpoint must be
 * treated as an expected empty result, not reported to Sentry.
 */

import type { ProjectImpact } from "@/services/project-impacts.service";
import { HttpError } from "@/utilities/api/errors";

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

// Mock the typed api client (impacts migrated off fetchData in #1775)
const mockApiGet = vi.fn();
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
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
import { getProjectImpacts } from "@/services/project-impacts.service";

const mockErrorManager = errorManager as ReturnType<typeof vi.fn>;

const httpError = (status: number, message: string) =>
  new HttpError(status, {
    endpoint: "/projects/test-project/impacts",
    method: "GET",
    body: { message },
  });

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
      mockApiGet.mockResolvedValueOnce(mockImpacts);

      const result = await getProjectImpacts("test-project");

      expect(result).toEqual(mockImpacts);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("regression GAP-FRONTEND-24Z: returns [] and does NOT report to Sentry on 404", async () => {
      mockApiGet.mockRejectedValueOnce(httpError(404, "Route not found"));

      const result = await getProjectImpacts("test-project");

      expect(result).toEqual([]);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("reports genuinely unexpected errors (5xx) to Sentry", async () => {
      const error = httpError(500, "Internal Server Error");
      mockApiGet.mockRejectedValueOnce(error);

      const result = await getProjectImpacts("test-project");

      expect(result).toEqual([]);
      expect(mockErrorManager).toHaveBeenCalledTimes(1);
      const [message, errArg, opts] = mockErrorManager.mock.calls[0];
      expect(message).toContain("Project Impacts API Error");
      expect(errArg).toBe(error);
      expect(opts).toEqual({ context: "project-impacts.service" });
    });

    it("returns [] when the endpoint responds with a null body (unknown slug)", async () => {
      mockApiGet.mockResolvedValueOnce(null as unknown as ProjectImpact[]);

      const result = await getProjectImpacts("unknown-slug");

      expect(result).toEqual([]);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("calls the V1 impacts endpoint (locks the wire contract)", async () => {
      mockApiGet.mockResolvedValueOnce(mockImpacts);

      await getProjectImpacts("my-project-slug");

      expect(mockApiGet.mock.calls[0][0]).toBe("/projects/my-project-slug/impacts");
    });

    it("forwards isAuthorized and signal via the options object", async () => {
      mockApiGet.mockResolvedValueOnce(mockImpacts);
      const controller = new AbortController();

      await getProjectImpacts("test-project", {
        isAuthorized: false,
        signal: controller.signal,
      });

      const opts = mockApiGet.mock.calls[0][1];
      expect(opts?.isAuthorized).toBe(false);
      expect(opts?.signal).toBe(controller.signal);
    });
  });
});
