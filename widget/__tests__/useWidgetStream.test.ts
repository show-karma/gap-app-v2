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

describe("useWidgetStream auth", () => {
  /**
   * The endpoint authenticates optionally: anonymous visitors get answers,
   * signed-in users get personalized ones. So the header has to appear when a
   * host can supply a token and stay away when it cannot — and neither case may
   * stop someone chatting.
   */
  const headersOf = (call: number = 0) =>
    mockFetch.mock.calls[call][1].headers as Record<string, string>;

  const send = async (getAuthToken?: () => unknown) => {
    mockFetch.mockResolvedValueOnce(createSSEResponse([]));
    const { result } = renderHook(() =>
      useWidgetStream({
        apiUrl: "https://test.api/v2/agent/stream",
        communityId: "filecoin",
        getAuthToken: getAuthToken as never,
      })
    );
    await act(async () => {
      await result.current.sendMessage("Hi");
    });
  };

  it("sends no Authorization header when the host supplies no callback", async () => {
    await send(undefined);

    expect(headersOf()).not.toHaveProperty("Authorization");
    expect(headersOf()["Content-Type"]).toBe("application/json");
  });

  it("sends the token as a bearer when the host supplies one", async () => {
    await send(() => "tok_123");

    expect(headersOf().Authorization).toBe("Bearer tok_123");
  });

  it("awaits an async callback, so a refresh can happen first", async () => {
    await send(async () => "tok_async");

    expect(headersOf().Authorization).toBe("Bearer tok_async");
  });

  it("stays anonymous when the callback returns null", async () => {
    // A signed-out visitor on a host that has the callback wired up.
    await send(() => null);

    expect(headersOf()).not.toHaveProperty("Authorization");
  });

  it("stays anonymous when the callback throws, rather than failing the message", async () => {
    await send(() => {
      throw new Error("token lookup exploded");
    });

    expect(headersOf()).not.toHaveProperty("Authorization");
    expect(useAgentChatStore.getState().error).toBeNull();
  });

  it("asks for a token on every message, so a stale one is never reused", async () => {
    const getAuthToken = vi.fn().mockReturnValueOnce("tok_first").mockReturnValueOnce("tok_second");
    mockFetch.mockResolvedValue(createSSEResponse([]));

    const { result } = renderHook(() =>
      useWidgetStream({
        apiUrl: "https://test.api/v2/agent/stream",
        communityId: "filecoin",
        getAuthToken,
      })
    );
    await act(async () => {
      await result.current.sendMessage("first");
    });
    await act(async () => {
      await result.current.sendMessage("second");
    });

    expect(getAuthToken).toHaveBeenCalledTimes(2);
    expect(headersOf(0).Authorization).toBe("Bearer tok_first");
    expect(headersOf(1).Authorization).toBe("Bearer tok_second");
  });
});
