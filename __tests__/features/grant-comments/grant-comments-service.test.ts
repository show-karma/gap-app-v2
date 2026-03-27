import { GrantCommentsService } from "@/src/features/grant-comments/api/grant-comments-service";
import type { GrantComment } from "@/src/features/grant-comments/types";
import fetchData from "@/utilities/fetchData";

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

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
    jest.clearAllMocks();
  });

  describe("getComments", () => {
    it("should return comments on success", async () => {
      const comments = [createMockComment(), createMockComment({ id: "comment-2" })];
      mockFetchData.mockResolvedValue([{ comments }, null, null, 200] as any);

      const result = await GrantCommentsService.getComments("project-123", "program-456");

      expect(result).toEqual(comments);
      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/grants/project-123/program-456/comments",
        "GET"
      );
    });

    it("should throw on error instead of silently returning empty array", async () => {
      mockFetchData.mockResolvedValue([null, "Network error", null, 500] as any);

      await expect(GrantCommentsService.getComments("project-123", "program-456")).rejects.toThrow(
        "Network error"
      );
    });

    it("should return empty array when data has no comments", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200] as any);

      const result = await GrantCommentsService.getComments("project-123", "program-456");
      expect(result).toEqual([]);
    });
  });

  describe("createComment", () => {
    it("should create a comment and return it", async () => {
      const comment = createMockComment();
      mockFetchData.mockResolvedValue([{ comment }, null, null, 201] as any);

      const result = await GrantCommentsService.createComment(
        "project-123",
        "program-456",
        "New comment"
      );

      expect(result).toEqual(comment);
      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/grants/project-123/program-456/comments",
        "POST",
        { content: "New comment" }
      );
    });

    it("should throw on error", async () => {
      mockFetchData.mockResolvedValue([null, "Unauthorized", null, 401] as any);

      await expect(
        GrantCommentsService.createComment("project-123", "program-456", "content")
      ).rejects.toThrow("Unauthorized");
    });

    it("should throw when response is missing comment", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200] as any);

      await expect(
        GrantCommentsService.createComment("project-123", "program-456", "content")
      ).rejects.toThrow("Unexpected API response: missing comment");
    });
  });

  describe("editComment", () => {
    it("should edit a comment and return updated version", async () => {
      const comment = createMockComment({ content: "Updated content" });
      mockFetchData.mockResolvedValue([{ comment }, null, null, 200] as any);

      const result = await GrantCommentsService.editComment("comment-1", "Updated content");

      expect(result).toEqual(comment);
      expect(mockFetchData).toHaveBeenCalledWith("/v2/grant-comments/comment-1", "PUT", {
        content: "Updated content",
      });
    });

    it("should throw on error", async () => {
      mockFetchData.mockResolvedValue([null, "Not found", null, 404] as any);

      await expect(GrantCommentsService.editComment("comment-1", "content")).rejects.toThrow(
        "Not found"
      );
    });

    it("should throw when response is missing comment", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200] as any);

      await expect(GrantCommentsService.editComment("comment-1", "content")).rejects.toThrow(
        "Unexpected API response: missing comment"
      );
    });
  });

  describe("deleteComment", () => {
    it("should delete a comment successfully", async () => {
      mockFetchData.mockResolvedValue([null, null, null, 204] as any);

      await expect(GrantCommentsService.deleteComment("comment-1")).resolves.toBeUndefined();

      expect(mockFetchData).toHaveBeenCalledWith("/v2/grant-comments/comment-1", "DELETE");
    });

    it("should throw on error", async () => {
      mockFetchData.mockResolvedValue([null, "Forbidden", null, 403] as any);

      await expect(GrantCommentsService.deleteComment("comment-1")).rejects.toThrow("Forbidden");
    });
  });
});
