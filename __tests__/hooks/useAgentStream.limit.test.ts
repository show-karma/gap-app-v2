/**
 * @file Tests for useAgentStream's working-limit (`limit_reached`) handling.
 * Split out of useAgentStream.test.ts to keep each test module under the size
 * limit. Setup mirrors that file (jscpd ignores test files, so the duplicated
 * fetch/SSE scaffolding carries no duplication penalty).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useAgentChatStore } from "@/store/agentChat";

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

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn().mockResolvedValue("mock-token-123"),
  },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://api.test.com",
  },
}));

import { TokenManager } from "@/utilities/auth/token-manager";

const mockGetToken = TokenManager.getToken as vi.Mock;

function formatSSE(events: Array<{ type: string; [key: string]: unknown }>): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

// Mock ReadableStream body — jsdom doesn't reliably support getReader().read().
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

const mockFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
let savedFetch: typeof globalThis.fetch;

let testQueryClient: QueryClient;
function createWrapper() {
  testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: testQueryClient }, children);
  return Wrapper;
}

describe("useAgentStream — limit_reached", () => {
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

    useAgentChatStore.setState({
      messages: [],
      isOpen: false,
      isStreaming: false,
      error: null,
      limitReached: null,
      agentContext: null,
      pendingMentions: [],
      pendingTraceId: null,
      ratingCommentBoxOpenForMessageId: null,
    });
  });

  afterEach(() => {
    testQueryClient.clear();
  });

  it("should set limitReached (not error) on a limit_reached event", async () => {
    const sseText = formatSSE([
      { type: "assistant", message: { content: [{ type: "text", text: "Partial findings" }] } },
      { type: "limit_reached", reason: "budget", hadAssistantText: true },
    ]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Expensive question");
    });

    expect(useAgentChatStore.getState().limitReached).toEqual({ reason: "budget" });
    expect(useAgentChatStore.getState().error).toBeNull();
  });

  it("should set limitReached with reason 'time' on a per-run timeout abort", async () => {
    const sseText = formatSSE([{ type: "limit_reached", reason: "time" }]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Long task");
    });

    expect(useAgentChatStore.getState().limitReached).toEqual({ reason: "time" });
    expect(useAgentChatStore.getState().error).toBeNull();
  });

  it("should seed a fallback message when the limit was hit with no prose", async () => {
    const sseText = formatSSE([
      { type: "limit_reached", reason: "turns", hadAssistantText: false },
    ]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Tool-spree question");
    });

    const messages = useAgentChatStore.getState().messages;
    const lastAssistant = messages.findLast((m) => m.role === "assistant");
    expect(lastAssistant?.content).toMatch(/working limit/i);
    expect(useAgentChatStore.getState().limitReached).toEqual({ reason: "turns" });
  });

  it("should keep streamed prose and not overwrite it with the fallback", async () => {
    const sseText = formatSSE([
      {
        type: "stream_event",
        event: {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Here is what I found" },
        },
      },
      { type: "limit_reached", reason: "budget", hadAssistantText: true },
    ]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Question");
    });

    const lastAssistant = useAgentChatStore
      .getState()
      .messages.findLast((m) => m.role === "assistant");
    expect(lastAssistant?.content).toBe("Here is what I found");
  });

  it("continueLastRun clears the limit and sends another request with history", async () => {
    mockFetch.mockResolvedValue(
      createStreamResponse(
        formatSSE([{ type: "limit_reached", reason: "budget", hadAssistantText: false }])
      )
    );

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("First");
    });
    expect(useAgentChatStore.getState().limitReached).toEqual({ reason: "budget" });

    mockFetch.mockResolvedValue(createStreamResponse(""));
    await act(async () => {
      await result.current.continueLastRun();
    });

    expect(useAgentChatStore.getState().limitReached).toBeNull();
    // second fetch carries conversationHistory from the prior turn
    const lastCall = mockFetch.mock.calls.at(-1);
    const body = JSON.parse((lastCall?.[1] as RequestInit).body as string);
    expect(Array.isArray(body.conversationHistory)).toBe(true);
    expect(body.conversationHistory.length).toBeGreaterThan(0);
    // the synthetic working-limit fallback must NOT be replayed to the agent
    expect(
      body.conversationHistory.some((m: { content: string }) => /working limit/i.test(m.content))
    ).toBe(false);
  });
});
