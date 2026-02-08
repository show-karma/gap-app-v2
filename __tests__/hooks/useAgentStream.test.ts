/**
 * @file Tests for useAgentStream hook
 * @description Tests SSE streaming, message handling, and abort functionality.
 * Uses direct fetch mocking instead of MSW because jsdom's Response polyfill
 * does not support ReadableStream bodies needed for SSE stream parsing.
 */

import { act, renderHook } from "@testing-library/react";
import { server } from "@/__tests__/utils/msw/setup";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useAgentChatStore } from "@/store/agentChat";

// Mock TokenManager
jest.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: jest.fn().mockResolvedValue("mock-token-123"),
  },
}));

// Mock envVars
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://api.test.com",
  },
}));

import { TokenManager } from "@/utilities/auth/token-manager";

const mockGetToken = TokenManager.getToken as jest.Mock;

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
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
let savedFetch: typeof globalThis.fetch;

describe("useAgentStream", () => {
  beforeAll(() => {
    // Close MSW to prevent it from intercepting our direct fetch mocks.
    // MSW's Response polyfill doesn't support ReadableStream bodies in jsdom.
    server.close();
    savedFetch = globalThis.fetch;
  });

  afterAll(() => {
    // Restore and restart MSW for other test files in the same worker
    globalThis.fetch = savedFetch;
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
    mockGetToken.mockResolvedValue("mock-token-123");

    // Reset store state
    useAgentChatStore.setState({
      messages: [],
      isOpen: false,
      isStreaming: false,
      error: null,
      agentContext: null,
    });
  });

  describe("sendMessage", () => {
    it("should add user and assistant messages to the store", async () => {
      mockFetch.mockResolvedValue(createStreamResponse(""));

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage("Question");
      });

      expect(useAgentChatStore.getState().error).toBe("Rate limit exceeded, Try again later");
    });

    it("should set streaming to false after request completes", async () => {
      mockFetch.mockResolvedValue(createStreamResponse(""));

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().isStreaming).toBe(false);
    });

    it("should handle HTTP error response", async () => {
      mockFetch.mockResolvedValue(createErrorResponse(500, "Internal Server Error"));

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe("Internal Server Error");
    });

    it("should handle network failure", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBeTruthy();
    });

    it("should skip malformed JSON in SSE data", async () => {
      const sseText =
        "data: not-valid-json\n\n" +
        `data: ${JSON.stringify({
          type: "assistant",
          message: { content: [{ type: "text", text: "Valid" }] },
        })}\n\n`;
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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
      const { result } = renderHook(() => useAgentStream());

      expect(() => {
        act(() => {
          result.current.abort();
        });
      }).not.toThrow();
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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useAgentChatStore.getState().error).toBe("Agent query failed");
    });

    it("should not set error for successful result", async () => {
      const sseText = formatSSE([{ type: "result", is_error: false }]);
      mockFetch.mockResolvedValue(createStreamResponse(sseText));

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

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

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      const messages = useAgentChatStore.getState().messages;
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.content).toBe("Hello");
    });
  });
});
