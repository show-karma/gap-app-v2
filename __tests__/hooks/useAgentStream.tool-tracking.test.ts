/**
 * @file Tool-history tracking tests for useAgentStream
 * @description Split out from useAgentStream.test.ts to keep that file under
 * its quality-gate line limit. Same fetch/store setup; covers only the
 * SSE → toolHistory pipeline (tool_use extraction, MCP prefix stripping,
 * name-based fallback matching, error mapping).
 */

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

function formatSSE(events: Array<{ type: string; [key: string]: unknown }>): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

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

describe("useAgentStream — tool history tracking", () => {
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
    wrapper = createWrapper();
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

  it("registers tool_use entries from an assistant message and strips the MCP prefix", async () => {
    // Real indexer emits: assistant.message.content[] with tool_use blocks
    // named "mcp__<server>__<tool>". The hook layer strips the prefix
    // when emitting tool_result, so the frontend must do the same on
    // tool_use to keep names matchable.
    const sseText = formatSSE([
      {
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Looking into that…" },
            { type: "tool_use", id: "toolu_a", name: "mcp__gap-tools__run_sql" },
          ],
        },
      },
    ]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });
    await act(async () => {
      await result.current.sendMessage("query the db");
    });

    const assistantMsg = useAgentChatStore.getState().messages.find((m) => m.role === "assistant");
    expect(assistantMsg?.toolHistory?.[0]).toMatchObject({
      id: "toolu_a",
      name: "run_sql",
      status: "running",
    });
  });

  it("dedupes when the same tool appears in both stream_event and assistant event", async () => {
    // Defensive: stream_event tool_use is forward-compat with a future
    // indexer that forwards raw Anthropic stream events. Today's indexer
    // does not, but the dedupe must still work for the day it does.
    const sseText = formatSSE([
      {
        type: "stream_event",
        event: {
          type: "content_block_start",
          content_block: {
            type: "tool_use",
            id: "toolu_same",
            name: "mcp__gap-tools__search_grants",
          },
        },
      },
      {
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              id: "toolu_same",
              name: "mcp__gap-tools__search_grants",
            },
          ],
        },
      },
    ]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });
    await act(async () => {
      await result.current.sendMessage("ok");
    });

    const assistantMsg = useAgentChatStore.getState().messages.find((m) => m.role === "assistant");
    expect(assistantMsg?.toolHistory).toHaveLength(1);
    expect(assistantMsg?.toolHistory?.[0].name).toBe("search_grants");
  });

  it("marks a tool success on tool_result without tool_use_id by matching tool_name (current indexer)", async () => {
    // Today's indexer does NOT include tool_use_id on tool_result events
    // — only tool_name. The frontend falls back to matching the oldest
    // still-running tool with that base name.
    const sseText = formatSSE([
      {
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              id: "toolu_x",
              name: "mcp__gap-tools__aggregate_grants",
            },
          ],
        },
      },
      {
        type: "tool_result",
        tool_name: "aggregate_grants",
        result: { count: 12 },
      },
    ]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });
    await act(async () => {
      await result.current.sendMessage("ok");
    });

    const assistantMsg = useAgentChatStore.getState().messages.find((m) => m.role === "assistant");
    expect(assistantMsg?.toolHistory?.[0].status).toBe("success");
  });

  it("matches multiple parallel runs of the same tool oldest-first", async () => {
    // run_sql called twice in a row; tool_result events arrive in the
    // same sequence the tools were invoked. Oldest-first matching keeps
    // the order consistent.
    const sseText = formatSSE([
      {
        type: "assistant",
        message: {
          content: [
            { type: "tool_use", id: "toolu_1", name: "mcp__gap-tools__run_sql" },
            { type: "tool_use", id: "toolu_2", name: "mcp__gap-tools__run_sql" },
          ],
        },
      },
      { type: "tool_result", tool_name: "run_sql", result: { ok: true } },
      { type: "tool_result", tool_name: "run_sql", result: { ok: true } },
    ]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });
    await act(async () => {
      await result.current.sendMessage("ok");
    });

    const tools = useAgentChatStore
      .getState()
      .messages.find((m) => m.role === "assistant")?.toolHistory;
    expect(tools).toHaveLength(2);
    expect(tools?.[0]).toMatchObject({ id: "toolu_1", status: "success" });
    expect(tools?.[1]).toMatchObject({ id: "toolu_2", status: "success" });
  });

  it("prefers tool_use_id over name fallback when the indexer provides it", async () => {
    // Forward-compat with an indexer change that surfaces tool_use_id.
    // When the id is present we trust it — even if a stale running
    // tool with the same name happens to be older.
    const sseText = formatSSE([
      {
        type: "assistant",
        message: {
          content: [
            { type: "tool_use", id: "toolu_first", name: "mcp__gap-tools__run_sql" },
            { type: "tool_use", id: "toolu_second", name: "mcp__gap-tools__run_sql" },
          ],
        },
      },
      // Result targets the SECOND tool_use explicitly, even though
      // both are still "running".
      {
        type: "tool_result",
        tool_name: "run_sql",
        tool_use_id: "toolu_second",
        result: { ok: true },
      },
    ]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });
    await act(async () => {
      await result.current.sendMessage("ok");
    });

    const tools = useAgentChatStore
      .getState()
      .messages.find((m) => m.role === "assistant")?.toolHistory;
    expect(tools?.[0]).toMatchObject({ id: "toolu_first", status: "running" });
    expect(tools?.[1]).toMatchObject({ id: "toolu_second", status: "success" });
  });

  it("marks a tool error when tool_result carries is_error=true", async () => {
    // Forward-compat with an indexer change that also surfaces is_error.
    const sseText = formatSSE([
      {
        type: "assistant",
        message: {
          content: [{ type: "tool_use", id: "toolu_y", name: "mcp__gap-tools__run_sql" }],
        },
      },
      {
        type: "tool_result",
        tool_name: "run_sql",
        tool_use_id: "toolu_y",
        is_error: true,
        result: "SELECT failed",
      },
    ]);
    mockFetch.mockResolvedValue(createStreamResponse(sseText));

    const { result } = renderHook(() => useAgentStream(), { wrapper });
    await act(async () => {
      await result.current.sendMessage("ok");
    });

    const assistantMsg = useAgentChatStore.getState().messages.find((m) => m.role === "assistant");
    expect(assistantMsg?.toolHistory?.[0].status).toBe("error");
  });
});
