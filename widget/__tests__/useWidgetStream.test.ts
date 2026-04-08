import { act, renderHook } from "@testing-library/react";
import { useAgentChatStore } from "@/store/agentChat";
import { useWidgetStream } from "../useWidgetStream";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createSSEResponse(events: Array<{ type: string; [k: string]: unknown }>) {
  const text = events.map((e) => `data: ${JSON.stringify(e)}`).join("\n\n");
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAgentChatStore.getState().clearMessages();
});

describe("useWidgetStream", () => {
  it("sends a message and processes SSE stream events", async () => {
    mockFetch.mockResolvedValueOnce(
      createSSEResponse([
        {
          type: "stream_event",
          event: { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } },
        },
        {
          type: "stream_event",
          event: { type: "content_block_delta", delta: { type: "text_delta", text: " world" } },
        },
      ])
    );

    const { result } = renderHook(() =>
      useWidgetStream({ apiUrl: "https://test.api/v2/agent/stream", communityId: "filecoin" })
    );

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    const messages = useAgentChatStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("Hi");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].content).toBe("Hello world");
    expect(messages[1].isStreaming).toBe(false);
  });

  it("sends communityId in the request body", async () => {
    mockFetch.mockResolvedValueOnce(createSSEResponse([]));

    const { result } = renderHook(() =>
      useWidgetStream({ apiUrl: "https://test.api/v2/agent/stream", communityId: "filecoin" })
    );

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.api/v2/agent/stream",
      expect.objectContaining({
        body: expect.stringContaining('"communityId":"filecoin"'),
      })
    );
  });

  it("does NOT send Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(createSSEResponse([]));

    const { result } = renderHook(() =>
      useWidgetStream({ apiUrl: "https://test.api/v2/agent/stream", communityId: "filecoin" })
    );

    await act(async () => {
      await result.current.sendMessage("test");
    });

    const fetchCall = mockFetch.mock.calls[0][1];
    expect(fetchCall.headers).not.toHaveProperty("Authorization");
  });

  it("sets error on HTTP failure", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "rate limited" }), { status: 429 })
    );

    const { result } = renderHook(() =>
      useWidgetStream({ apiUrl: "https://test.api/v2/agent/stream", communityId: "filecoin" })
    );

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(useAgentChatStore.getState().error).toBe("rate limited");
  });
});
