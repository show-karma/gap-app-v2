/**
 * @file Analytics tests for `comment_posted` and `application_status_changed`.
 *
 * `comment_posted` is one event across three surfaces, so the assertions are
 * about the two properties that let a report tell them apart. The status change
 * is tracked in the service rather than in a hook precisely because four screens
 * drive it — this pins that placement.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const commentsService = vi.hoisted(() => ({
  CommentsService: {
    getComments: vi.fn().mockResolvedValue([]),
    getPublicComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn(),
    createPublicComment: vi.fn(),
    deleteComment: vi.fn(),
    updateComment: vi.fn(),
  },
}));
vi.mock("@/src/features/application-comments/api/comments-service", () => commentsService);

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "0xviewer", authenticated: true, user: null }),
}));

const authApiClient = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => authApiClient,
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useApplicationComments } from "@/src/features/application-comments/hooks/use-application-comments";
import { usePublicCommenting } from "@/src/features/application-comments/hooks/use-public-commenting";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("comment_posted", () => {
  it("marks a reviewer's application comment as internal", async () => {
    commentsService.CommentsService.createComment.mockResolvedValue({ id: "c1", content: "hi" });

    const { result } = renderHook(() => useApplicationComments({ applicationId: "app-1" }), {
      wrapper,
    });
    act(() => {
      result.current.addComment("Looks good");
    });

    await waitFor(() => expect(track).toHaveBeenCalled());

    expect(track).toHaveBeenCalledWith("comment_posted", {
      target_type: "application",
      is_public: false,
      is_reply: false,
    });
  });

  it("marks a public application comment as public", async () => {
    commentsService.CommentsService.createPublicComment.mockResolvedValue({
      id: "c1",
      content: "hi",
    });

    const { result } = renderHook(() => usePublicCommenting({ referenceNumber: "APP-1" }), {
      wrapper,
    });
    act(() => {
      result.current.addComment("Any update?");
    });

    await waitFor(() => expect(track).toHaveBeenCalled());

    expect(track).toHaveBeenCalledWith("comment_posted", {
      target_type: "application",
      is_public: true,
      is_reply: false,
    });
  });

  it("never carries the comment body", async () => {
    commentsService.CommentsService.createComment.mockResolvedValue({ id: "c1" });

    const { result } = renderHook(() => useApplicationComments({ applicationId: "app-1" }), {
      wrapper,
    });
    act(() => {
      result.current.addComment("contact me at reviewer@example.test");
    });

    await waitFor(() => expect(track).toHaveBeenCalled());

    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain("reviewer@example.test");
  });
});

describe("application_status_changed", () => {
  it("reports the new status from the one service call every screen shares", async () => {
    const { fundingPlatformService } = await import("@/services/fundingPlatformService");
    authApiClient.put.mockResolvedValue({ data: { id: "app-1", status: "approved" } });

    await fundingPlatformService.applications.updateApplicationStatus("app-1", {
      status: "approved",
      reason: "Strong proposal from alice@example.test",
    } as never);

    expect(track).toHaveBeenCalledWith("application_status_changed", {
      application_id: "app-1",
      to: "approved",
    });
  });

  it("never carries the admin's reason text", async () => {
    const { fundingPlatformService } = await import("@/services/fundingPlatformService");
    authApiClient.put.mockResolvedValue({ data: {} });

    await fundingPlatformService.applications.updateApplicationStatus("app-1", {
      status: "rejected",
      reason: "Duplicate of alice@example.test's earlier application",
    } as never);

    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain("alice@example.test");
  });

  it("reports nothing when the status write fails", async () => {
    const { fundingPlatformService } = await import("@/services/fundingPlatformService");
    authApiClient.put.mockRejectedValue(new Error("409 conflict"));

    await expect(
      fundingPlatformService.applications.updateApplicationStatus("app-1", {
        status: "approved",
        reason: "",
      } as never)
    ).rejects.toThrow();

    expect(track).not.toHaveBeenCalled();
  });
});
