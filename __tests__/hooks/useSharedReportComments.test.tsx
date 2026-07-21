/**
 * @file Tests for the React Query hook that powers the donor-shared
 * report comment surface. Asserts polling pause when disabled,
 * optimistic root + reply append, error rollback to the previous
 * snapshot, and tree assembly correctness.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { useSharedReportComments } from "@/hooks/useSharedReportComments";
import {
  listSharedReportComments,
  postSharedReportComment,
} from "@/services/donor-research-comments.service";
import type {
  SharedReportComment,
  SharedReportCommentsResponse,
} from "@/types/donor-research-comments";

vi.mock("@/services/donor-research-comments.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/donor-research-comments.service")>(
    "@/services/donor-research-comments.service"
  );
  return {
    ...actual,
    listSharedReportComments: vi.fn(),
    postSharedReportComment: vi.fn(),
  };
});

const mockList = vi.mocked(listSharedReportComments);
const mockPost = vi.mocked(postSharedReportComment);

function makeRoot(overrides: Partial<SharedReportComment> = {}): SharedReportComment {
  return {
    id: "root-1",
    parentCommentId: null,
    isAdvisor: false,
    displayName: "Donor Dana",
    anchor: { kind: "section", sectionKey: "methodology" },
    body: "Looks good",
    createdAt: "2026-06-19T00:00:00.000Z",
    ...overrides,
  };
}

function makeReply(
  parentId: string,
  overrides: Partial<SharedReportComment> = {}
): SharedReportComment {
  return {
    id: `reply-${parentId}`,
    parentCommentId: parentId,
    isAdvisor: false,
    displayName: "Advisor Avi",
    anchor: null,
    body: "Thanks for flagging",
    createdAt: "2026-06-19T00:01:00.000Z",
    ...overrides,
  };
}

let queryClient: QueryClient;
const TOKEN = "share-token-1";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
});

afterEach(() => {
  queryClient.clear();
});

describe("useSharedReportComments — loading + success", () => {
  it("starts in loading state and resolves with an assembled tree", async () => {
    const root = makeRoot();
    const reply = makeReply(root.id);
    const response: SharedReportCommentsResponse = {
      roots: [root],
      replies: [reply],
      pageInfo: { nextCursor: null },
    };
    mockList.mockResolvedValue(response);

    const { result } = renderHook(() => useSharedReportComments(TOKEN), { wrapper });
    expect(result.current.query.isLoading).toBe(true);
    await waitFor(() => expect(result.current.query.isLoading).toBe(false));
    expect(result.current.tree).toHaveLength(1);
    expect(result.current.tree[0].children).toHaveLength(1);
    expect(result.current.tree[0].children[0].id).toBe(reply.id);
  });

  it("returns an empty tree when no comments exist", async () => {
    mockList.mockResolvedValue({ roots: [], replies: [], pageInfo: { nextCursor: null } });
    const { result } = renderHook(() => useSharedReportComments(TOKEN), { wrapper });
    await waitFor(() => expect(result.current.query.isLoading).toBe(false));
    expect(result.current.tree).toEqual([]);
  });

  it("surfaces an error when the list service fails", async () => {
    mockList.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useSharedReportComments(TOKEN), { wrapper });
    await waitFor(() => expect(result.current.query.error).toBeInstanceOf(Error));
    expect(result.current.tree).toEqual([]);
  });
});

describe("useSharedReportComments — enabled gate", () => {
  it("does not call the list service when disabled", () => {
    renderHook(() => useSharedReportComments(TOKEN, { enabled: false }), { wrapper });
    expect(mockList).not.toHaveBeenCalled();
  });
});

describe("useSharedReportComments — optimistic mutations", () => {
  it("optimistically appends a new root and clears it on settled invalidate", async () => {
    const initial: SharedReportCommentsResponse = {
      roots: [makeRoot({ id: "existing" })],
      replies: [],
      pageInfo: { nextCursor: null },
    };
    mockList.mockResolvedValue(initial);
    const created = makeRoot({ id: "new-root", body: "Optimistic body" });
    mockPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(created), 300);
        })
    );

    const { result } = renderHook(() => useSharedReportComments(TOKEN), { wrapper });
    await waitFor(() => expect(result.current.tree).toHaveLength(1));

    act(() => {
      void result.current.postComment.mutate({
        request: {
          body: "Optimistic body",
          displayName: "Donor",
          anchor: { kind: "section", sectionKey: "methodology" },
        },
        idempotencyKey: "key-1",
      });
    });

    // Optimistic add — the new root appears immediately.
    await waitFor(() => expect(result.current.tree[0].id).toContain("optimistic-key-1"));
    await waitFor(() => expect(result.current.postComment.isPending).toBe(false));
  });

  it("keeps the failed optimistic comment (flagged for retry) instead of rolling back", async () => {
    const existing = makeRoot({ id: "existing" });
    mockList.mockResolvedValue({
      roots: [existing],
      replies: [],
      pageInfo: { nextCursor: null },
    });
    mockPost.mockRejectedValue(new Error("nope"));

    const { result } = renderHook(() => useSharedReportComments(TOKEN), { wrapper });
    await waitFor(() => expect(result.current.tree).toHaveLength(1));
    await act(async () => {
      try {
        await result.current.postComment.mutateAsync({
          request: { body: "x", displayName: "Donor" },
          idempotencyKey: "key-2",
        });
      } catch {
        // expected
      }
    });
    // On failure we deliberately do NOT roll back: vanishing the row would
    // throw away the donor's text. The optimistic row stays in place, its
    // pending state cleared and `_failed` set, so the UI can surface a Retry
    // affordance. Invalidation (which would wipe it) only runs on success.
    await waitFor(() => {
      const failed = result.current.tree.find((n) => n._failed);
      expect(failed).toBeDefined();
    });
    const failedRow = result.current.tree.find((n) => n._failed);
    expect(failedRow?.id).toContain("optimistic-key-2");
    expect(failedRow?._optimistic).toBe(false);
    // The pre-existing comment is untouched.
    expect(result.current.tree.some((n) => n.id === "existing")).toBe(true);
  });

  it("appends a reply under its parent on optimistic add", async () => {
    const root = makeRoot({ id: "p1" });
    mockList.mockResolvedValue({
      roots: [root],
      replies: [],
      pageInfo: { nextCursor: null },
    });
    mockPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(makeReply("p1")), 300);
        })
    );
    const { result } = renderHook(() => useSharedReportComments(TOKEN), { wrapper });
    await waitFor(() => expect(result.current.tree).toHaveLength(1));
    act(() => {
      void result.current.postComment.mutate({
        request: { body: "reply body", displayName: "Avi", parentCommentId: "p1" },
        idempotencyKey: "key-3",
      });
    });
    await waitFor(() => expect(result.current.tree[0].children).toHaveLength(1));
  });
});
