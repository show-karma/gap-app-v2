import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
}));

vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => ({
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  }),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      APPLICATIONS: {
        COMMENTS: (id: string) => `/v2/applications/${id}/comments`,
        BY_PROJECT_UID: (uid: string) => `/v2/applications/by-project/${uid}`,
        DELETE: (ref: string) => `/v2/applications/${ref}`,
      },
    },
  },
}));

import { applicationCommentsService } from "@/services/application-comments.service";
import { deleteApplication, fetchApplicationByProjectUID } from "@/services/funding-applications";
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as ReturnType<typeof vi.fn>;

describe("application-comments service trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getComments ---

  describe("getComments", () => {
    it("calls fetchData with correct endpoint", async () => {
      mockFetchData.mockResolvedValue([{ comments: [] }, null, null, 200]);

      await applicationCommentsService.getComments("app-1");

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/applications/app-1/comments",
        "GET",
        {},
        expect.any(Object)
      );
    });

    it("passes admin flag as param when isAdmin=true", async () => {
      mockFetchData.mockResolvedValue([{ comments: [] }, null, null, 200]);

      await applicationCommentsService.getComments("app-1", true);

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.any(String),
        "GET",
        {},
        expect.objectContaining({ admin: "true" })
      );
    });

    it("does not pass admin param when isAdmin is false/undefined", async () => {
      mockFetchData.mockResolvedValue([{ comments: [] }, null, null, 200]);

      await applicationCommentsService.getComments("app-1", false);

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.any(String),
        "GET",
        {},
        expect.not.objectContaining({ admin: "true" })
      );
    });

    it("returns comments array", async () => {
      const comments = [
        { id: "c1", content: "Great work!" },
        { id: "c2", content: "Needs revision" },
      ];
      mockFetchData.mockResolvedValue([{ comments }, null, null, 200]);

      const result = await applicationCommentsService.getComments("app-1");

      expect(result).toEqual(comments);
    });

    it("throws on fetchData error", async () => {
      mockFetchData.mockResolvedValue([null, "Not Found", null, 404]);

      await expect(applicationCommentsService.getComments("app-1")).rejects.toThrow("Not Found");
    });
  });

  // --- createComment ---

  describe("createComment", () => {
    it("uses apiClient.post with content", async () => {
      mockPost.mockResolvedValue({
        data: { comment: { id: "c1", content: "New comment" } },
      });

      const result = await applicationCommentsService.createComment("app-1", "New comment");

      expect(mockPost).toHaveBeenCalledWith("/v2/applications/app-1/comments", {
        content: "New comment",
      });
      expect(result).toEqual({ id: "c1", content: "New comment" });
    });
  });

  // --- editComment ---

  describe("editComment", () => {
    it("uses apiClient.put with comment ID", async () => {
      mockPut.mockResolvedValue({
        data: { comment: { id: "c1", content: "Updated" } },
      });

      const result = await applicationCommentsService.editComment("c1", "Updated");

      expect(mockPut).toHaveBeenCalledWith("/v2/comments/c1", {
        content: "Updated",
      });
      expect(result).toEqual({ id: "c1", content: "Updated" });
    });
  });

  // --- deleteComment ---

  describe("deleteComment", () => {
    it("uses apiClient.delete with comment ID", async () => {
      mockDelete.mockResolvedValue({});

      await applicationCommentsService.deleteComment("c1");

      expect(mockDelete).toHaveBeenCalledWith("/v2/comments/c1", {
        params: {},
      });
    });

    it("passes admin flag when isAdmin=true", async () => {
      mockDelete.mockResolvedValue({});

      await applicationCommentsService.deleteComment("c1", true);

      expect(mockDelete).toHaveBeenCalledWith("/v2/comments/c1", {
        params: { admin: "true" },
      });
    });
  });
});

describe("funding-applications service trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- fetchApplicationByProjectUID ---

  describe("fetchApplicationByProjectUID", () => {
    it("returns application data on success", async () => {
      const app = { id: "a1", projectUID: "p1", status: "submitted" };
      mockFetchData.mockResolvedValue([app, null, null, 200]);

      const result = await fetchApplicationByProjectUID("p1");

      expect(result).toEqual(app);
    });

    it("returns null when no application found (404 error string)", async () => {
      mockFetchData.mockResolvedValue([null, "404 not found", null, 404]);

      const result = await fetchApplicationByProjectUID("p1");

      expect(result).toBeNull();
    });

    it("returns null when error contains 'not found'", async () => {
      mockFetchData.mockResolvedValue([null, "Application not found", null, 404]);

      const result = await fetchApplicationByProjectUID("p1");

      expect(result).toBeNull();
    });

    it("throws on non-404 errors", async () => {
      mockFetchData.mockResolvedValue([null, "Internal server error", null, 500]);

      await expect(fetchApplicationByProjectUID("p1")).rejects.toThrow("Internal server error");
    });

    it("returns null when data is null but no error", async () => {
      mockFetchData.mockResolvedValue([null, null, null, 200]);

      const result = await fetchApplicationByProjectUID("p1");

      expect(result).toBeNull();
    });
  });

  // --- deleteApplication ---

  describe("deleteApplication", () => {
    it("calls apiClient.delete with reference number", async () => {
      mockDelete.mockResolvedValue({});

      await deleteApplication("REF-001");

      expect(mockDelete).toHaveBeenCalledWith("/v2/applications/REF-001");
    });

    it("rethrows error from apiClient", async () => {
      const axiosError: Error & { response?: { status: number; statusText: string } } = new Error(
        "Forbidden"
      );
      axiosError.response = { status: 403, statusText: "Forbidden" };
      mockDelete.mockRejectedValue(axiosError);

      await expect(deleteApplication("REF-001")).rejects.toThrow("Forbidden");
    });
  });
});
