/**
 * @file Tests for useChatRating — submits user thumbs-up/thumbs-down to Langfuse
 * and persists the chosen rating in the chat store so the UI reflects it.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatRating } from "@/hooks/useChatRating";
import { useAgentChatStore } from "@/store/agentChat";

const mockScore = vi.fn().mockResolvedValue(undefined);
const mockGetLangfuseWeb = vi.fn();

vi.mock("@/lib/langfuse-web", () => ({
  getLangfuseWeb: () => mockGetLangfuseWeb(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("useChatRating", () => {
  beforeEach(() => {
    mockScore.mockClear();
    mockScore.mockResolvedValue(undefined);
    mockGetLangfuseWeb.mockReset();
    mockGetLangfuseWeb.mockReturnValue({ score: mockScore });

    useAgentChatStore.setState({
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          content: "answer",
          timestamp: 1,
          traceId: "trace-abc",
        },
      ],
      isOpen: false,
      isStreaming: false,
      error: null,
      agentContext: null,
      pendingMentions: [],
    });
  });

  afterEach(() => {
    useAgentChatStore.setState({
      messages: [],
      isOpen: false,
      isStreaming: false,
      error: null,
      agentContext: null,
      pendingMentions: [],
    });
  });

  it("should_expose_null_rating_when_message_has_no_rating", () => {
    const { result } = renderHook(() => useChatRating("assistant-1", "trace-abc"));

    expect(result.current.rating).toBeNull();
  });

  it("should_score_via_langfuse_and_persist_rating_in_store_on_submit", async () => {
    const { result } = renderHook(() => useChatRating("assistant-1", "trace-abc"));

    await act(async () => {
      await result.current.submit(1);
    });

    expect(mockScore).toHaveBeenCalledWith({
      traceId: "trace-abc",
      name: "user_rating",
      value: 1,
    });

    const stored = useAgentChatStore.getState().messages.find((m) => m.id === "assistant-1");
    expect(stored?.rating).toBe(1);
  });

  it("should_forward_optional_comment_to_langfuse", async () => {
    const { result } = renderHook(() => useChatRating("assistant-1", "trace-abc"));

    await act(async () => {
      await result.current.submit(-1, "missed the question");
    });

    expect(mockScore).toHaveBeenCalledWith({
      traceId: "trace-abc",
      name: "user_rating",
      value: -1,
      comment: "missed the question",
    });

    const stored = useAgentChatStore.getState().messages.find((m) => m.id === "assistant-1");
    expect(stored?.rating).toBe(-1);
  });

  it("should_no_op_when_traceId_is_missing", async () => {
    const { result } = renderHook(() => useChatRating("assistant-1", undefined));

    await act(async () => {
      await result.current.submit(1);
    });

    expect(mockScore).not.toHaveBeenCalled();
    const stored = useAgentChatStore.getState().messages.find((m) => m.id === "assistant-1");
    expect(stored?.rating).toBeUndefined();
  });

  it("should_no_op_when_langfuse_client_unavailable", async () => {
    mockGetLangfuseWeb.mockReturnValue(null);
    const { result } = renderHook(() => useChatRating("assistant-1", "trace-abc"));

    await act(async () => {
      await result.current.submit(1);
    });

    expect(mockScore).not.toHaveBeenCalled();
    const stored = useAgentChatStore.getState().messages.find((m) => m.id === "assistant-1");
    expect(stored?.rating).toBeUndefined();
  });

  it("should_capture_exception_and_keep_state_unchanged_when_langfuse_throws", async () => {
    mockScore.mockRejectedValueOnce(new Error("network"));
    const Sentry = await import("@sentry/nextjs");
    const { result } = renderHook(() => useChatRating("assistant-1", "trace-abc"));

    await act(async () => {
      await result.current.submit(1);
    });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const stored = useAgentChatStore.getState().messages.find((m) => m.id === "assistant-1");
    expect(stored?.rating).toBeUndefined();
  });
});
