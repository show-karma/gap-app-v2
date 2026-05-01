/**
 * @file Tests for useChatRating — submits user thumbs-up/thumbs-down to the
 * gap-indexer rating endpoint (which proxies to Langfuse server-side) and
 * persists the chosen rating in the chat store so the UI reflects it.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatRating } from "@/hooks/useChatRating";
import { useAgentChatStore } from "@/store/agentChat";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn().mockResolvedValue("test-token"),
  },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.test",
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const fetchMock = vi.fn();

beforeEach(async () => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 204 });
  vi.stubGlobal("fetch", fetchMock);
  const Sentry = await import("@sentry/nextjs");
  vi.mocked(Sentry.captureException).mockClear();
});

describe("useChatRating", () => {
  beforeEach(() => {
    // Replace state (second `true` arg) so newly added store fields like
    // `pendingTraceId` and `ratingCommentBoxOpenForMessageId` start at
    // their initial values and don't leak across tests.
    useAgentChatStore.setState(
      {
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
        pendingTraceId: null,
        ratingCommentBoxOpenForMessageId: null,
      } as Partial<ReturnType<typeof useAgentChatStore.getState>>,
      false
    );
  });

  afterEach(() => {
    useAgentChatStore.setState(
      {
        messages: [],
        isOpen: false,
        isStreaming: false,
        error: null,
        agentContext: null,
        pendingMentions: [],
        pendingTraceId: null,
        ratingCommentBoxOpenForMessageId: null,
      } as Partial<ReturnType<typeof useAgentChatStore.getState>>,
      false
    );
    vi.unstubAllGlobals();
  });

  it("should_expose_null_rating_when_message_has_no_rating", () => {
    const { result } = renderHook(() => useChatRating("assistant-1", "trace-abc"));

    expect(result.current.rating).toBeNull();
  });

  it("should_post_to_indexer_rating_endpoint_and_persist_rating_on_submit", async () => {
    const { result } = renderHook(() => useChatRating("assistant-1", "trace-abc"));

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.submit(1);
    });

    expect(returned).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://indexer.test/v2/agent/rating");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(init.body)).toEqual({ traceId: "trace-abc", value: 1 });

    const stored = useAgentChatStore.getState().messages.find((m) => m.id === "assistant-1");
    expect(stored?.rating).toBe(1);
  });


  it("should_forward_optional_comment_in_request_body", async () => {
    const { result } = renderHook(() => useChatRating("assistant-1", "trace-abc"));

    await act(async () => {
      await result.current.submit(-1, "missed the question");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      traceId: "trace-abc",
      value: -1,
      comment: "missed the question",
    });

    const stored = useAgentChatStore.getState().messages.find((m) => m.id === "assistant-1");
    expect(stored?.rating).toBe(-1);
  });

  it("should_return_false_and_skip_request_when_traceId_is_missing", async () => {
    const { result } = renderHook(() => useChatRating("assistant-1", undefined));

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.submit(1);
    });

    expect(returned).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    const stored = useAgentChatStore.getState().messages.find((m) => m.id === "assistant-1");
    expect(stored?.rating).toBeUndefined();
  });

  it("should_return_false_and_capture_exception_when_request_fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: () => Promise.resolve("upstream blew up"),
    });
    const Sentry = await import("@sentry/nextjs");
    const { result } = renderHook(() => useChatRating("assistant-1", "trace-abc"));

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.submit(1);
    });

    expect(returned).toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    // Caller relies on the boolean to decide whether to clear UI state
    // — store rating must NOT be set on failure.
    const stored = useAgentChatStore.getState().messages.find((m) => m.id === "assistant-1");
    expect(stored?.rating).toBeUndefined();
    // Response body should be threaded into the captured error message
    // so 4xx triage in Sentry doesn't require correlation with server logs.
    const capturedError = vi.mocked(Sentry.captureException).mock.calls[0][0] as Error;
    expect(capturedError.message).toContain("upstream blew up");
  });

  it("should_capture_exception_and_keep_state_unchanged_when_fetch_throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
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
