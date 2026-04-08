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
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as ReturnType<typeof vi.fn>;

describe("Regression: error.includes() crash on Error objects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("programReviewersService.getReviewers", () => {
    it("should not crash when fetchData returns an Error object (network error)", async () => {
      const networkError = new Error("Network Error");
      mockFetchData.mockResolvedValue([null, networkError, null, 500]);

      // Before the fix, this would throw TypeError: error.includes is not a function
      // After the fix, it should throw a proper Error with the message
      await expect(programReviewersService.getReviewers("p1")).rejects.toThrow("Network Error");
    });

    it("should still handle string errors correctly", async () => {
      mockFetchData.mockResolvedValue([null, "Program Reviewer Not Found", null, 404]);

      const result = await programReviewersService.getReviewers("p1");
      expect(result).toEqual([]);
    });

    it("should handle Error objects with 'No reviewers found' message", async () => {
      const error = new Error("No reviewers found");
      mockFetchData.mockResolvedValue([null, error, null, 404]);

      const result = await programReviewersService.getReviewers("p1");
      expect(result).toEqual([]);
    });
  });

  describe("milestoneReviewersService.getReviewers", () => {
    it("should not crash when fetchData returns an Error object (network error)", async () => {
      const networkError = new Error("Network Error");
      mockFetchData.mockResolvedValue([null, networkError, null, 500]);

      await expect(milestoneReviewersService.getReviewers("p1")).rejects.toThrow("Network Error");
    });

    it("should handle Error objects with known message", async () => {
      const error = new Error("Milestone Reviewer Not Found");
      mockFetchData.mockResolvedValue([null, error, null, 404]);

      const result = await milestoneReviewersService.getReviewers("p1");
      expect(result).toEqual([]);
    });
  });

  describe("fetchApplicationByProjectUID", () => {
    it("should not crash when fetchData returns an Error object (network error)", async () => {
      const networkError = new Error("Network Error");
      mockFetchData.mockResolvedValue([null, networkError, null, 500]);

      await expect(fetchApplicationByProjectUID("uid-1")).rejects.toThrow("Network Error");
    });

    it("should handle Error objects with 404 message", async () => {
      const error = new Error("404 not found");
      mockFetchData.mockResolvedValue([null, error, null, 404]);

      const result = await fetchApplicationByProjectUID("uid-1");
      expect(result).toBeNull();
    });
  });
});
