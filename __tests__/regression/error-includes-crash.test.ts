/**
 * Regression test for Bug #1: error.includes() crash on network errors
 *
 * When fetchData encounters a network error (no response), it sets
 * `error = err` (the raw Error object). Services that call error.includes()
 * would crash with TypeError because Error objects don't have .includes().
 *
 * Fixed by coercing error to string before calling .includes() in all
 * affected services: program-reviewers, milestone-reviewers,
 * funding-applications, fundingPlatformService.
 */

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
}));

// programReviewersService, milestoneReviewersService, and
// fetchApplicationByProjectUID were migrated off fetchData onto the unified
// api client in #1775 Phase 3 — the regression these tests guard against
// (a non-string error crashing `.includes()`) now lives in the api-client
// error path (httpErrorMessage), not the fetchData adapter.
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

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      FUNDING_PROGRAMS: {
        REVIEWERS: (id: string) => `/v2/funding-program-configs/${id}/reviewers`,
      },
      MILESTONE_REVIEWERS: {
        LIST: (id: string) => `/v2/programs/${id}/milestone-reviewers`,
      },
      APPLICATIONS: {
        BY_PROJECT_UID: (uid: string) => `/v2/applications/by-project/${uid}`,
      },
    },
  },
}));

vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => ({
    post: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/utilities/validators", () => ({
  validateEmail: vi.fn(() => true),
  validateTelegram: vi.fn(() => true),
  validateReviewerData: vi.fn(() => ({ valid: true, errors: [] })),
}));

vi.mock("axios", () => ({
  default: { isAxiosError: vi.fn(() => false), create: vi.fn() },
}));

import { fetchApplicationByProjectUID } from "@/services/funding-applications";
import { milestoneReviewersService } from "@/services/milestone-reviewers.service";
import { programReviewersService } from "@/services/program-reviewers.service";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockApiGet = api.get as ReturnType<typeof vi.fn>;

describe("Regression: error.includes() crash on Error objects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("programReviewersService.getReviewers", () => {
    it("should not crash when api.get rejects with a plain Error (network error)", async () => {
      const networkError = new Error("Network Error");
      mockApiGet.mockRejectedValue(networkError);

      // Before the fix, this would throw TypeError: error.includes is not a function
      // After the fix, it should throw a proper Error with the message
      await expect(programReviewersService.getReviewers("p1")).rejects.toThrow("Network Error");
    });

    it("should still handle string errors correctly", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(404, {
          endpoint: "/v2/funding-program-configs/p1/reviewers",
          method: "GET",
          body: { message: "Program Reviewer Not Found" },
        })
      );

      const result = await programReviewersService.getReviewers("p1");
      expect(result).toEqual([]);
    });

    it("should handle Error objects with 'No reviewers found' message", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(404, {
          endpoint: "/v2/funding-program-configs/p1/reviewers",
          method: "GET",
          body: { message: "No reviewers found" },
        })
      );

      const result = await programReviewersService.getReviewers("p1");
      expect(result).toEqual([]);
    });
  });

  describe("milestoneReviewersService.getReviewers", () => {
    it("should not crash when api.get rejects with a plain Error (network error)", async () => {
      const networkError = new Error("Network Error");
      mockApiGet.mockRejectedValue(networkError);

      await expect(milestoneReviewersService.getReviewers("p1")).rejects.toThrow("Network Error");
    });

    it("should handle Error objects with known message", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(404, {
          endpoint: "/v2/programs/p1/milestone-reviewers",
          method: "GET",
          body: { message: "Milestone Reviewer Not Found" },
        })
      );

      const result = await milestoneReviewersService.getReviewers("p1");
      expect(result).toEqual([]);
    });
  });

  describe("fetchApplicationByProjectUID", () => {
    it("should not crash when api.get rejects with a plain Error (network error)", async () => {
      const networkError = new Error("Network Error");
      mockApiGet.mockRejectedValue(networkError);

      await expect(fetchApplicationByProjectUID("uid-1")).rejects.toThrow("Network Error");
    });

    it("should return null on a 404 (no application found)", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(404, {
          endpoint: "/v2/applications/by-project/uid-1",
          method: "GET",
          body: { message: "404 not found" },
        })
      );

      const result = await fetchApplicationByProjectUID("uid-1");
      expect(result).toBeNull();
    });
  });
});
