import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { useGrantComments } from "@/src/features/grant-comments/hooks/use-grant-comments";
import type { GrantComment } from "@/src/features/grant-comments/types";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true }),
}));

vi.mock("@/src/features/grant-comments/api/grant-comments-service", () => ({
  GrantCommentsService: {
    getComments: vi.fn(),
    createComment: vi.fn(),
    editComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

const mockService = jest.requireMock(
  "@/src/features/grant-comments/api/grant-comments-service"
).GrantCommentsService;

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

let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useGrantComments", () => {
  const defaultOptions = { projectUID: "project-123", programId: "program-456" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe("fetching comments", () => {
    it("should fetch comments on mount when authenticated", async () => {
      const comments = [createMockComment(), createMockComment({ id: "comment-2" })];
      mockService.getComments.mockResolvedValue(comments);

      const { result } = renderHook(() => useGrantComments(defaultOptions), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.comments).toEqual(comments);
      expect(mockService.getComments).toHaveBeenCalledWith("project-123", "program-456");
    });

    it("should expose error when fetch fails", async () => {
      mockService.getComments.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useGrantComments(defaultOptions), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(result.current.error?.message).toBe("Network error");
      expect(result.current.comments).toEqual([]);
    });

    it("should not fetch when projectUID is empty", () => {
      const { result } = renderHook(
        () => useGrantComments({ projectUID: "", programId: "program-456" }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockService.getComments).not.toHaveBeenCalled();
    });

    it("should not fetch when programId is empty", () => {
      const { result } = renderHook(
        () => useGrantComments({ projectUID: "project-123", programId: "" }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockService.getComments).not.toHaveBeenCalled();
    });
  });

  describe("createCommentAsync", () => {
    it("should create a comment and update the cache", async () => {
      const existing = [createMockComment()];
      const newComment = createMockComment({ id: "comment-new", content: "New comment" });
      mockService.getComments.mockResolvedValue(existing);
      mockService.createComment.mockResolvedValue(newComment);

      const { result } = renderHook(() => useGrantComments(defaultOptions), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createCommentAsync({ content: "New comment" });
      });

      expect(mockService.createComment).toHaveBeenCalledWith(
        "project-123",
        "program-456",
        "New comment"
      );
    });

    it("should not create a comment with empty content", async () => {
      mockService.getComments.mockResolvedValue([]);

      const { result } = renderHook(() => useGrantComments(defaultOptions), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createCommentAsync({ content: "   " });
      });

      expect(mockService.createComment).not.toHaveBeenCalled();
    });
  });

  describe("editCommentAsync", () => {
    it("should edit a comment", async () => {
      const comment = createMockComment();
      const updated = createMockComment({ content: "Updated" });
      mockService.getComments.mockResolvedValue([comment]);
      mockService.editComment.mockResolvedValue(updated);

      const { result } = renderHook(() => useGrantComments(defaultOptions), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.editCommentAsync({ commentId: "comment-1", content: "Updated" });
      });

      expect(mockService.editComment).toHaveBeenCalledWith("comment-1", "Updated");
    });

    it("should not edit with empty content", async () => {
      mockService.getComments.mockResolvedValue([]);

      const { result } = renderHook(() => useGrantComments(defaultOptions), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.editCommentAsync({ commentId: "comment-1", content: "" });
      });

      expect(mockService.editComment).not.toHaveBeenCalled();
    });
  });

  describe("deleteCommentAsync", () => {
    it("should delete a comment", async () => {
      const comment = createMockComment();
      mockService.getComments.mockResolvedValue([comment]);
      mockService.deleteComment.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGrantComments(defaultOptions), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteCommentAsync("comment-1");
      });

      expect(mockService.deleteComment).toHaveBeenCalledWith("comment-1");
    });

    it("should rollback on delete failure", async () => {
      const comment = createMockComment();
      mockService.getComments.mockResolvedValue([comment]);
      mockService.deleteComment.mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useGrantComments(defaultOptions), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.deleteCommentAsync("comment-1");
        } catch {
          // Expected
        }
      });

      // After rollback + refetch, comments should still be there
      await waitFor(() => {
        expect(result.current.comments).toHaveLength(1);
      });
    });
  });
});
