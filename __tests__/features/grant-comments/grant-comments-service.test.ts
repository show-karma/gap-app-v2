import { GrantCommentsService } from "@/src/features/grant-comments/api/grant-comments-service";
import type { GrantComment } from "@/src/features/grant-comments/types";
import { api } from "@/utilities/api/client";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiGet = api.get as vi.MockedFunction<typeof api.get>;
const mockApiPost = api.post as vi.MockedFunction<typeof api.post>;
const mockApiPut = api.put as vi.MockedFunction<typeof api.put>;
const mockApiDelete = api.delete as vi.MockedFunction<typeof api.delete>;

function createMockComment(overrides: Partial<GrantComment> = {}): GrantComment {
  return {
    id: "comment-1",
    projectUID: "project-123",
    programId: "program-456",
    authorAddress: "0xabc",
    authorRole: "admin",
    authorName: "Test User",
    content: "Test comment",
    isDeleted: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("GrantCommentsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getComments", () => {
    it("should return comments on success", async () => {
      const comments = [createMockComment(), createMockComment({ id: "comment-2" })];
      mockApiGet.mockResolvedValue({ comments } as any);

      const result = await GrantCommentsService.getComments("project-123", "program-456");

      expect(result).toEqual(comments);
      expect(mockApiGet).toHaveBeenCalledWith("/v2/grants/project-123/program-456/comments");
    });

    it("should throw on error instead of silently returning empty array", async () => {
      mockApiGet.mockRejectedValue(new Error("Network error"));

      await expect(GrantCommentsService.getComments("project-123", "program-456")).rejects.toThrow(
        "Network error"
      );
    });

    it("should return empty array when data has no comments", async () => {
      mockApiGet.mockResolvedValue({} as any);

      const result = await GrantCommentsService.getComments("project-123", "program-456");
      expect(result).toEqual([]);
    });
  });

  describe("createComment", () => {
    it("should create a comment and return it", async () => {
      const comment = createMockComment();
      mockApiPost.mockResolvedValue({ comment } as any);

      const result = await GrantCommentsService.createComment(
        "project-123",
        "program-456",
        "New comment"
      );

      expect(result).toEqual(comment);
      expect(mockApiPost).toHaveBeenCalledWith("/v2/grants/project-123/program-456/comments", {
        content: "New comment",
      });
    });

    it("should throw on error", async () => {
      mockApiPost.mockRejectedValue(new Error("Unauthorized"));

      await expect(
        GrantCommentsService.createComment("project-123", "program-456", "content")
      ).rejects.toThrow("Unauthorized");
    });

    it("should throw when response is missing comment", async () => {
      mockApiPost.mockResolvedValue({} as any);

      await expect(
        GrantCommentsService.createComment("project-123", "program-456", "content")
      ).rejects.toThrow("Unexpected API response: missing comment");
    });
  });

  describe("editComment", () => {
    it("should edit a comment and return updated version", async () => {
      const comment = createMockComment({ content: "Updated content" });
      mockApiPut.mockResolvedValue({ comment } as any);

      const result = await GrantCommentsService.editComment("comment-1", "Updated content");

      expect(result).toEqual(comment);
      expect(mockApiPut).toHaveBeenCalledWith("/v2/grant-comments/comment-1", {
        content: "Updated content",
      });
    });

    it("should throw on error", async () => {
      mockApiPut.mockRejectedValue(new Error("Not found"));

      await expect(GrantCommentsService.editComment("comment-1", "content")).rejects.toThrow(
        "Not found"
      );
    });

    it("should throw when response is missing comment", async () => {
      mockApiPut.mockResolvedValue({} as any);

      await expect(GrantCommentsService.editComment("comment-1", "content")).rejects.toThrow(
        "Unexpected API response: missing comment"
      );
    });
  });

  describe("deleteComment", () => {
    it("should delete a comment successfully", async () => {
      mockApiDelete.mockResolvedValue(undefined as any);

      await expect(GrantCommentsService.deleteComment("comment-1")).resolves.toBeUndefined();

      expect(mockApiDelete).toHaveBeenCalledWith("/v2/grant-comments/comment-1");
    });

    it("should throw on error", async () => {
      mockApiDelete.mockRejectedValue(new Error("Forbidden"));

      await expect(GrantCommentsService.deleteComment("comment-1")).rejects.toThrow("Forbidden");
    });
  });
});
