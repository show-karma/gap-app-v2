import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import type { ApplicationComment } from "@/types/funding-platform";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../../api/reviewer-comments-service", () => ({
  getReviewerComments: vi.fn(),
  createReviewerComment: vi.fn(),
  editReviewerComment: vi.fn(),
  deleteReviewerComment: vi.fn(),
}));

import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  createReviewerComment,
  deleteReviewerComment,
  editReviewerComment,
  getReviewerComments,
} from "../../api/reviewer-comments-service";
import { reviewerCommentsQueryKey, useReviewerComments } from "../use-reviewer-comments";

const comment = (overrides: Partial<ApplicationComment> = {}): ApplicationComment => ({
  id: "c1",
  applicationId: "app-1",
  authorAddress: "0xabc",
  authorRole: "reviewer",
  content: "first",
  isDeleted: false,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

describe("useReviewerComments", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.mocked(useAuth).mockReturnValue({ authenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(getReviewerComments).mockResolvedValue([comment()]);
  });

  it("does not fetch while signed out", () => {
    vi.mocked(useAuth).mockReturnValue({ authenticated: false } as ReturnType<typeof useAuth>);

    renderHook(() => useReviewerComments("REF-1"), { wrapper });

    expect(getReviewerComments).not.toHaveBeenCalled();
  });

  it("loads the discussion for the application", async () => {
    const { result } = renderHook(() => useReviewerComments("REF-1"), { wrapper });

    await waitFor(() => expect(result.current.comments).toHaveLength(1));
    expect(getReviewerComments).toHaveBeenCalledWith("REF-1");
  });

  it("appends a posted comment", async () => {
    vi.mocked(createReviewerComment).mockResolvedValue(comment({ id: "c2", content: "second" }));
    vi.mocked(getReviewerComments)
      .mockResolvedValueOnce([comment()])
      .mockResolvedValue([comment(), comment({ id: "c2", content: "second" })]);
    const { result } = renderHook(() => useReviewerComments("REF-1"), { wrapper });
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    await act(() => result.current.addComment("second"));

    expect(createReviewerComment).toHaveBeenCalledWith("REF-1", "second");
    await waitFor(() => expect(result.current.comments).toHaveLength(2));
  });

  it("rolls back an optimistic edit when the request fails", async () => {
    vi.mocked(editReviewerComment).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useReviewerComments("REF-1"), { wrapper });
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    await act(async () => {
      await result.current.editComment("c1", "changed").catch(() => undefined);
    });

    expect(queryClient.getQueryData(reviewerCommentsQueryKey("REF-1"))).toEqual([comment()]);
    expect(toast.error).toHaveBeenCalled();
  });

  it("removes a deleted comment", async () => {
    vi.mocked(deleteReviewerComment).mockResolvedValue(undefined);
    vi.mocked(getReviewerComments).mockResolvedValueOnce([comment()]).mockResolvedValue([]);
    const { result } = renderHook(() => useReviewerComments("REF-1"), { wrapper });
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    await act(() => result.current.deleteComment("c1"));

    expect(deleteReviewerComment).toHaveBeenCalledWith("REF-1", "c1");
    await waitFor(() => expect(result.current.comments).toHaveLength(0));
  });
});
