/**
 * @file Tests for useAgentStream hook
 * @description Tests SSE streaming, message handling, and abort functionality.
 * Uses direct fetch mocking instead of MSW because jsdom's Response polyfill
 * does not support ReadableStream bodies needed for SSE stream parsing.
 */

import * as Sentry from "@sentry/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useAgentChatStore } from "@/store/agentChat";

// Mock next/navigation (hook uses useRouter internally)
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: "/",
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => ({ get: vi.fn() })),
  useParams: vi.fn(() => ({})),
}));

// Mock TokenManager
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn().mockResolvedValue("mock-token-123"),
  },
}));

// Mock envVars
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://api.test.com",
  },
}));

import { TokenManager } from "@/utilities/auth/token-manager";

const mockGetToken = TokenManager.getToken as vi.Mock;

// Helper to create SSE formatted text from event data
function formatSSE(events: Array<{ type: string; [key: string]: unknown }>): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

// Helper to create a mock ReadableStream body with a custom reader.
// Uses a mock reader instead of native ReadableStream because jsdom's
// environment does not reliably support ReadableStream.getReader().read().
function createMockBody(sseText: string) {
  const encoder = new TextEncoder();
  const encoded = sseText ? encoder.encode(sseText) : null;
  let consumed = false;

  return {
    getReader() {
      return {
        async read() {
          if (!consumed && encoded) {
            consumed = true;
            return { done: false as const, value: encoded };
          }
          return { done: true as const, value: undefined };
        },
        releaseLock() {},
        cancel: async () => {},
        closed: Promise.resolve(undefined),
      };
    },
    locked: false,
    cancel: async () => {},
    tee: () => [null, null],
    pipeTo: async () => {},
    pipeThrough: () => null,
    [Symbol.asyncIterator]: async function* () {},
  };
}

// Helper to create a mock Response with a readable body for SSE
function createStreamResponse(sseText: string): Response {
  const encoder = new TextEncoder();
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "text/event-stream" }),
    body: createMockBody(sseText) as unknown as ReadableStream<Uint8Array>,
    bodyUsed: false,
    redirected: false,
    type: "default" as ResponseType,
    url: "https://api.test.com/v2/agent/stream",
    text: async () => sseText,
    json: async () => JSON.parse(sseText),
    blob: async () => new Blob([sseText]),
    formData: async () => new FormData(),
    arrayBuffer: async () => encoder.encode(sseText).buffer,
    bytes: async () => encoder.encode(sseText),
    clone() {
      return createStreamResponse(sseText);
    },
  } as Response;
}

// Helper to create a mock error Response
function createErrorResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    statusText: "Error",
    headers: new Headers(),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: "default" as ResponseType,
    url: "https://api.test.com/v2/agent/stream",
    text: async () => body,
    json: async () => JSON.parse(body),
    blob: async () => new Blob([body]),
    formData: async () => new FormData(),
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
    bytes: async () => new TextEncoder().encode(body),
    clone() {
      return createErrorResponse(status, body);
    },
  } as Response;
}

// Direct fetch mock — avoids MSW + jsdom ReadableStream incompatibility
const mockFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
let savedFetch: typeof globalThis.fetch;

// QueryClient wrapper for useQueryClient inside useAgentStream
let testQueryClient: QueryClient;
function createWrapper() {
  testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: testQueryClient }, children);
  return Wrapper;
}

describe("useAgentStream", () => {
  beforeAll(() => {
    savedFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = savedFetch;
  });

  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
    mockGetToken.mockResolvedValue("mock-token-123");
    wrapper = createWrapper();

    // Reset store state — queryClient cleanup is in afterEach.
    // Explicitly resets every field that any test in this suite
    // mutates so Zustand's partial-merge semantics can't leak state
    // between tests (e.g. the trace-buffering test writes
    // pendingTraceId, which would carry over without this).
    useAgentChatStore.setState({
      messages: [],
      isOpen: false,
      isStreaming: false,
      error: null,
      agentContext: null,
      pendingMentions: [],
      pendingTraceId: null,
      ratingCommentBoxOpenForMessageId: null,
    });
  });

  afterEach(() => {
    testQueryClient.clear();
  });

  describe("sendMessage", () => {
    it("should add user and assistant messages to the store", async () => {
      mockFetch.mockResolvedValue(createStreamResponse(""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Hello agent");
      });

      const messages = useAgentChatStore.getState().messages;
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Hello agent");
      expect(messages[1].role).toBe("assistant");
    });

    it("should set user message content correctly", async () => {
      mockFetch.mockResolvedValue(createStreamResponse(""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("What is my project status?");
      });

      const messages = useAgentChatStore.getState().messages;
      expect(messages[0].content).toBe("What is my project status?");
      expect(messages[0].id).toMatch(/^user-/);
    });

    it("should handle stream_event delta text", async () => {
      const sseText = formatSSE([
        {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Hello " },
          },
        },
        {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "world!" },
          },
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Say hi");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toBe("Hello world!");
    });

    it("should handle assistant message type", async () => {
      const sseText = formatSSE([
        {
          type: "assistant",
          message: {
            content: [{ type: "text", text: "Full response here" }],
          },
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Question");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toBe("Full response here");
    });

    it("should handle result event with errors", async () => {
      const sseText = formatSSE([
        {
          type: "result",
          is_error: true,
          errors: ["Rate limit exceeded", "Try again later"],
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Question");
      });

      expect(useAgentChatStore.getState().error).toBe("Rate limit exceeded, Try again later");
    });

    it("should set streaming to false after request completes", async () => {
      mockFetch.mockResolvedValue(createStreamResponse(""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().isStreaming).toBe(false);
    });

    it("should handle HTTP error response with user-friendly message", async () => {
      mockFetch.mockResolvedValue(createErrorResponse(500, "Internal Server Error"));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe(
        "Something went wrong on my end. Please try again."
      );
    });

    it("should parse JSON error responses and extract message field", async () => {
      mockFetch.mockResolvedValue(
        createErrorResponse(
          401,
          JSON.stringify({
            statusCode: 401,
            error: "Unauthorized",
            message: "Authorization header with JWT is required",
          })
        )
      );

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe("Authorization header with JWT is required");
    });

    it("should parse JSON error responses and fall back to error field", async () => {
      mockFetch.mockResolvedValue(
        createErrorResponse(
          403,
          JSON.stringify({ error: "Daily agent usage budget exceeded. Please try again tomorrow." })
        )
      );

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe(
        "Daily agent usage budget exceeded. Please try again tomorrow."
      );
    });

    it("should show user-friendly message for 409 session conflict", async () => {
      mockFetch.mockResolvedValue(
        createErrorResponse(
          409,
          JSON.stringify({ error: "An agent session is already active for user 0x123" })
        )
      );

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe(
        "Please wait for your current request to complete before sending another."
      );
    });

    it("should show user-friendly message for 5xx plain text errors", async () => {
      mockFetch.mockResolvedValue(createErrorResponse(502, "Bad Gateway"));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe(
        "Something went wrong on my end. Please try again."
      );
    });

    it("should show user-friendly message for empty error responses", async () => {
      mockFetch.mockResolvedValue(createErrorResponse(500, ""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe(
        "Something went wrong on my end. Please try again."
      );
    });

    it("should capture HTTP errors in Sentry", async () => {
      mockFetch.mockResolvedValue(createErrorResponse(500, "Internal Server Error"));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Agent stream error: HTTP 500" }),
        expect.objectContaining({
          extra: expect.objectContaining({ status: 500 }),
        })
      );
    });

    it("should show rate limit message for 429 errors", async () => {
      mockFetch.mockResolvedValue(createErrorResponse(429, ""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe(
        "I'm getting a lot of requests right now. Please wait a moment and try again."
      );
    });

    it("should show unavailable message for 503 errors", async () => {
      mockFetch.mockResolvedValue(createErrorResponse(503, ""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe(
        "I'm temporarily unavailable. Please try again in a few minutes."
      );
    });

    it("should use backend message for 403 errors when descriptive", async () => {
      mockFetch.mockResolvedValue(
        createErrorResponse(
          403,
          JSON.stringify({
            message: "Daily agent usage budget exceeded. Please try again tomorrow.",
          })
        )
      );

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe(
        "Daily agent usage budget exceeded. Please try again tomorrow."
      );
    });

    it("should handle network failure", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBeTruthy();
    });

    it("should handle multi-line SSE data fields per spec", async () => {
      // Per SSE spec, multiple data: lines in one event block are joined with \n.
      // Split at a token boundary so the \n acts as valid JSON whitespace.
      const sseText =
        'data: {"type":"assistant",\n' +
        'data: "message":{"content":[{"type":"text","text":"Multi-line"}]}}\n\n';
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toBe("Multi-line");
    });

    it("should skip malformed JSON in SSE data", async () => {
      const sseText =
        "data: not-valid-json\n\n" +
        `data: ${JSON.stringify({
          type: "assistant",
          message: { content: [{ type: "text", text: "Valid" }] },
        })}\n\n`;
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toBe("Valid");
    });

    it("should accumulate delta text from multiple stream events", async () => {
      const sseText = formatSSE([
        {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "First " },
          },
        },
        {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "second " },
          },
        },
        {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "third" },
          },
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toBe("First second third");
    });

    it("should include agentContext in request body", async () => {
      mockFetch.mockResolvedValue(createStreamResponse(""));

      useAgentChatStore.setState({
        agentContext: { projectId: "proj-123" },
      });

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("About this project");
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, fetchInit] = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchInit?.body as string);
      expect(body.message).toBe("About this project");
      expect(body.projectId).toBe("proj-123");
    });

    it("should send Authorization header with token", async () => {
      mockFetch.mockResolvedValue(createStreamResponse(""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, fetchInit] = mockFetch.mock.calls[0];
      const headers = fetchInit?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer mock-token-123");
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should omit Authorization header when no token", async () => {
      mockGetToken.mockResolvedValue(null);
      mockFetch.mockResolvedValue(createStreamResponse(""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, fetchInit] = mockFetch.mock.calls[0];
      const headers = fetchInit?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBeUndefined();
    });
  });

  describe("abort", () => {
    it("should not throw when called without active stream", () => {
      const { result } = renderHook(() => useAgentStream(), { wrapper });

      expect(() => {
        act(() => {
          result.current.abort();
        });
      }).not.toThrow();
    });
  });

  describe("system events", () => {
    it("should_set_traceId_on_last_assistant_message_when_trace_started_event_arrives", async () => {
      // Wire-accurate payload: the backend ships `event: system / data:
      // {"type":"trace_started","traceId":"..."}`. parseSSEChunk reads
      // only the JSON, so the dispatcher sees `type: "trace_started"`.
      const sseText = formatSSE([{ type: "trace_started", traceId: "trace-xyz" }]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.traceId).toBe("trace-xyz");
    });

    it("should_ignore_anthropic_sdk_system_init_event_without_traceId", async () => {
      // The Anthropic SDK also uses `event: system` for its own init
      // event, with `data: {"type":"system","subtype":"init",...}` and
      // no traceId. The handler must no-op for this shape.
      const sseText = formatSSE([{ type: "system", subtype: "init" }]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const assistantMsg = useAgentChatStore
        .getState()
        .messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.traceId).toBeUndefined();
    });

    it("should_buffer_traceId_when_system_event_arrives_before_assistant_message_exists", async () => {
      // Direct unit-level coverage: in production the SSE parser may
      // dispatch the system event before the assistant placeholder is
      // added to the store (timing varies by transport). The store
      // must buffer the traceId in pendingTraceId and consume it when
      // the next assistant message is added via addMessage.
      const store = useAgentChatStore.getState();

      // No assistant message yet — setLastAssistantTraceId should buffer.
      store.setLastAssistantTraceId("trace-buffered");
      expect(useAgentChatStore.getState().pendingTraceId).toBe("trace-buffered");
      expect(useAgentChatStore.getState().messages).toHaveLength(0);

      // Now add the assistant message — it should pick up the buffered traceId.
      store.addMessage({
        id: "assistant-late",
        role: "assistant",
        content: "",
        timestamp: 1,
        isStreaming: true,
      });

      const after = useAgentChatStore.getState();
      expect(after.pendingTraceId).toBeNull();
      const assistantMsg = after.messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.traceId).toBe("trace-buffered");
    });

    it("should_ignore_system_event_without_traceId", async () => {
      const sseText = formatSSE([{ type: "system" }]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const assistantMsg = useAgentChatStore
        .getState()
        .messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.traceId).toBeUndefined();
    });
  });

  describe("tool_result events", () => {
    it("should set toolResult on last assistant message for preview_ tools", async () => {
      const sseText = formatSSE([
        {
          type: "tool_result",
          tool_name: "preview_update_project",
          result: { title: "New Title", description: "Updated" },
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Update my project");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.toolResult).toEqual({
        type: "preview",
        toolName: "preview_update_project",
        data: { title: "New Title", description: "Updated" },
        status: "pending",
      });
    });

    it("should not set toolResult for non-preview tools", async () => {
      const sseText = formatSSE([
        {
          type: "tool_result",
          tool_name: "get_project_details",
          result: { id: "proj-1" },
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Get project");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.toolResult).toBeUndefined();
    });

    it("should handle tool_result with no result data", async () => {
      const sseText = formatSSE([
        {
          type: "tool_result",
          tool_name: "preview_create_milestone",
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Create milestone");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.toolResult?.data).toEqual({});
    });
  });

  describe("sendConfirmation", () => {
    it("should update tool result status to approved and send approval message", async () => {
      // First, set up a message with a pending tool result
      useAgentChatStore.setState({
        messages: [
          {
            id: "assistant-1",
            role: "assistant",
            content: "Here are the proposed changes",
            timestamp: 1000,
            toolResult: {
              type: "preview",
              toolName: "preview_update_project",
              data: { title: "New" },
              status: "pending",
            },
          },
        ],
      });

      mockFetch.mockResolvedValue(createStreamResponse(""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendConfirmation("assistant-1", "preview_update_project", true);
      });

      // Check status was updated to approved
      const messages = useAgentChatStore.getState().messages;
      expect(messages[0].toolResult?.status).toBe("approved");

      // Check that sendMessage was called with approval text
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, fetchInit] = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchInit?.body as string);
      expect(body.message).toContain("approve");
      expect(body.message).toContain("preview_update_project");
    });

    it("should update tool result status to denied and send denial message", async () => {
      useAgentChatStore.setState({
        messages: [
          {
            id: "assistant-1",
            role: "assistant",
            content: "Here are the proposed changes",
            timestamp: 1000,
            toolResult: {
              type: "preview",
              toolName: "preview_update_project",
              data: { title: "New" },
              status: "pending",
            },
          },
        ],
      });

      mockFetch.mockResolvedValue(createStreamResponse(""));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendConfirmation("assistant-1", "preview_update_project", false);
      });

      // Check status was updated to denied
      const firstMsg = useAgentChatStore.getState().messages[0];
      expect(firstMsg.toolResult?.status).toBe("denied");

      // Check that sendMessage was called with denial text
      const [, fetchInit] = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchInit?.body as string);
      expect(body.message).toContain("reject");
      expect(body.message).toContain("preview_update_project");
    });
  });

  describe("result event edge cases", () => {
    it("should handle result with is_error but no errors array", async () => {
      const sseText = formatSSE([{ type: "result", is_error: true }]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe("Agent query failed");
    });

    it("should handle standalone error SSE events", async () => {
      const sseText = formatSSE([{ type: "error", message: "Model overloaded" }]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe("Model overloaded");
    });

    it("should handle standalone error SSE event with error field", async () => {
      const sseText = formatSSE([{ type: "error", error: "Connection lost" }]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe("Connection lost");
    });

    it("should not set error for successful result", async () => {
      const sseText = formatSSE([{ type: "result", is_error: false }]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBeNull();
    });

    it("should ignore non-text content blocks in assistant messages", async () => {
      const sseText = formatSSE([
        {
          type: "assistant",
          message: {
            content: [
              { type: "tool_use", id: "tool-1" },
              { type: "text", text: "Only this text" },
            ],
          },
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toBe("Only this text");
    });

    it("should ignore non-text_delta events in stream_event", async () => {
      const sseText = formatSSE([
        {
          type: "stream_event",
          event: { type: "content_block_start", index: 0 },
        },
        {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Hello" },
          },
        },
        {
          type: "stream_event",
          event: { type: "content_block_stop" },
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toBe("Hello");
    });
  });

  describe("tool_result content block parsing", () => {
    it("should extract data from content block format [{type,text}]", async () => {
      const innerJson = JSON.stringify({
        type: "preview",
        projectUid: "proj-1",
        changes: { title: { current: "Old", proposed: "New" } },
      });
      const sseText = formatSSE([
        {
          type: "tool_result",
          tool_name: "preview_update_project",
          result: { content: [{ type: "text", text: innerJson }] },
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Update project");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.toolResult?.data).toEqual({
        type: "preview",
        projectUid: "proj-1",
        changes: { title: { current: "Old", proposed: "New" } },
      });
    });

    it("should extract data from raw array content blocks", async () => {
      const innerJson = JSON.stringify({ type: "preview", projectUid: "proj-2" });
      const sseText = formatSSE([
        {
          type: "tool_result",
          tool_name: "preview_create_milestone",
          result: [{ type: "text", text: innerJson }],
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Create milestone");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.toolResult?.data).toEqual({
        type: "preview",
        projectUid: "proj-2",
      });
    });

    it("should pass through plain object results unchanged", async () => {
      const sseText = formatSSE([
        {
          type: "tool_result",
          tool_name: "preview_update_project",
          result: { title: "Direct", description: "Plain object" },
        },
      ]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Update");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.toolResult?.data).toEqual({
        title: "Direct",
        description: "Plain object",
      });
    });
  });

  describe("cache invalidation after approved commit", () => {
    it("should invalidate project queries after approved write", async () => {
      // Set up: a message with an approved tool result already exists
      useAgentChatStore.setState({
        messages: [
          {
            id: "assistant-1",
            role: "assistant",
            content: "Changes applied",
            timestamp: 1000,
            toolResult: {
              type: "preview",
              toolName: "preview_update_project",
              data: { title: "New" },
              status: "approved",
            },
          },
        ],
        agentContext: { projectId: "proj-123" },
      });

      mockFetch.mockResolvedValue(createStreamResponse(""));
      const invalidateSpy = vi.spyOn(testQueryClient, "invalidateQueries");

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Confirm changes");
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ predicate: expect.any(Function) })
      );
    });

    it("should not invalidate queries when no approved writes exist", async () => {
      useAgentChatStore.setState({
        messages: [],
        agentContext: { projectId: "proj-123" },
      });

      mockFetch.mockResolvedValue(createStreamResponse(""));
      const invalidateSpy = vi.spyOn(testQueryClient, "invalidateQueries");

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Just chatting");
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("should invalidate program queries when programId is in context", async () => {
      useAgentChatStore.setState({
        messages: [
          {
            id: "assistant-1",
            role: "assistant",
            content: "Done",
            timestamp: 1000,
            toolResult: {
              type: "preview",
              toolName: "preview_update_project",
              data: {},
              status: "approved",
            },
          },
        ],
        agentContext: { programId: "prog-456" },
      });

      mockFetch.mockResolvedValue(createStreamResponse(""));
      const invalidateSpy = vi.spyOn(testQueryClient, "invalidateQueries");

      const { result } = renderHook(() => useAgentStream(), { wrapper });

      await act(async () => {
        await result.current.sendMessage("Apply");
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["program", "prog-456"] })
      );
    });
  });
});
