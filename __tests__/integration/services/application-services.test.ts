import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

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
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockGet = api.get as ReturnType<typeof vi.fn>;

describe("application-comments service trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getComments ---

  describe("getComments", () => {
    it("calls api.get with correct endpoint", async () => {
      mockGet.mockResolvedValue({ comments: [] });

      await applicationCommentsService.getComments("app-1");

      expect(mockGet).toHaveBeenCalledWith("/v2/applications/app-1/comments", expect.anything());
    });

    it("passes admin flag as param when isAdmin=true", async () => {
      mockGet.mockResolvedValue({ comments: [] });

      await applicationCommentsService.getComments("app-1", true);

      expect(mockGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ params: expect.objectContaining({ admin: "true" }) })
      );
    });

    it("does not pass admin param when isAdmin is false/undefined", async () => {
      mockGet.mockResolvedValue({ comments: [] });

      await applicationCommentsService.getComments("app-1", false);

      expect(mockGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ params: expect.not.objectContaining({ admin: "true" }) })
      );
    });

    it("returns comments array", async () => {
      const comments = [
        { id: "c1", content: "Great work!" },
        { id: "c2", content: "Needs revision" },
      ];
      mockGet.mockResolvedValue({ comments });

      const result = await applicationCommentsService.getComments("app-1");

      expect(result).toEqual(comments);
    });

    it("throws on api.get error", async () => {
      mockGet.mockRejectedValue(
        new HttpError(404, {
          endpoint: "/v2/applications/app-1/comments",
          method: "GET",
          body: { message: "Not Found" },
        })
      );

      await expect(applicationCommentsService.getComments("app-1")).rejects.toThrow(HttpError);
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
    const endpoint = "/v2/applications/by-project/p1";

    it("returns application data on success", async () => {
      const app = { id: "a1", projectUID: "p1", status: "submitted" };
      mockGet.mockResolvedValue(app);

      const result = await fetchApplicationByProjectUID("p1");

      expect(result).toEqual(app);
    });

    it("returns null when no application found (404)", async () => {
      mockGet.mockRejectedValue(
        new HttpError(404, {
          endpoint,
          method: "GET",
          body: { message: "404 not found" },
        })
      );

      const result = await fetchApplicationByProjectUID("p1");

      expect(result).toBeNull();
    });

    it("returns null when error status is 404 regardless of message", async () => {
      mockGet.mockRejectedValue(
        new HttpError(404, {
          endpoint,
          method: "GET",
          body: { message: "Application not found" },
        })
      );

      const result = await fetchApplicationByProjectUID("p1");

      expect(result).toBeNull();
    });

    it("throws on non-404 errors", async () => {
      mockGet.mockRejectedValue(
        new HttpError(500, {
          endpoint,
          method: "GET",
          body: { message: "Internal server error" },
        })
      );

      await expect(fetchApplicationByProjectUID("p1")).rejects.toThrow("Internal server error");
    });

    it("returns null when data is null but no error", async () => {
      mockGet.mockResolvedValue(null);

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
