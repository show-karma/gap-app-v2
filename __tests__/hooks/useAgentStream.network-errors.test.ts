/**
 * @file Tests for useAgentStream connection-drop error handling (DEV-394)
 * @description A long agent run can keep the SSE stream open until an upstream
 * idle timeout severs it. The browser surfaces that as a `TypeError` on
 * `reader.read()` mid-stream, which we previously displayed verbatim (raw
 * "network error") and never reported to Sentry. These tests lock the friendly
 * message, the no-raw-string guarantee, and the Sentry capture/dedup contract.
 *
 * Extracted from useAgentStream.test.ts to keep that file under the size limit.
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

// Mock Response whose body reader rejects mid-stream — simulates the SSE
// connection being severed AFTER a successful 200 (e.g. an upstream idle
// timeout during a long agent run). The browser surfaces this as a
// TypeError on reader.read(); see DEV-394.
function createDroppedStreamResponse(error: Error): Response {
  const body = {
    getReader() {
      return {
        async read(): Promise<never> {
          throw error;
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
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "text/event-stream" }),
    body: body as unknown as ReadableStream<Uint8Array>,
    bodyUsed: false,
    redirected: false,
    type: "default" as ResponseType,
    url: "https://api.test.com/v2/agent/stream",
    text: async () => "",
    json: async () => ({}),
    blob: async () => new Blob([]),
    formData: async () => new FormData(),
    arrayBuffer: async () => new ArrayBuffer(0),
    bytes: async () => new Uint8Array(),
    clone() {
      return createDroppedStreamResponse(error);
    },
  } as Response;
}

// Mock error Response (pre-stream non-OK) — used to assert HTTP errors are not
// double-reported to Sentry by the stream catch block.
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

describe("useAgentStream — connection drops", () => {
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
      agentContext: null,
      pendingMentions: [],
      pendingTraceId: null,
      ratingCommentBoxOpenForMessageId: null,
    });
  });

  afterEach(() => {
    testQueryClient.clear();
  });

  it("should show a friendly message when the stream drops mid-response", async () => {
    mockFetch.mockResolvedValue(createDroppedStreamResponse(new TypeError("network error")));

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("what is pending Eva Shon's review?");
    });

    expect(useAgentChatStore.getState().error).toBe(
      "Unable to reach the server. Please check your connection and try again."
    );
  });

  it("should not leak the raw browser 'network error' string to the user", async () => {
    mockFetch.mockResolvedValue(createDroppedStreamResponse(new TypeError("network error")));

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Test");
    });

    expect(useAgentChatStore.getState().error).not.toBe("network error");
  });

  it("should capture mid-stream connection drops in Sentry", async () => {
    const dropError = new TypeError("network error");
    mockFetch.mockResolvedValue(createDroppedStreamResponse(dropError));

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Test");
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      dropError,
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: "ask-karma",
          phase: "agent-stream",
        }),
        extra: expect.objectContaining({
          rawMessage: "network error",
          displayedMessage:
            "Unable to reach the server. Please check your connection and try again.",
        }),
      })
    );
  });

  it("should treat a Firefox NetworkError stream drop as a connection issue", async () => {
    mockFetch.mockResolvedValue(
      createDroppedStreamResponse(new TypeError("NetworkError when attempting to fetch resource."))
    );

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Test");
    });

    expect(useAgentChatStore.getState().error).toBe(
      "Unable to reach the server. Please check your connection and try again."
    );
  });

  it("should not double-report HTTP errors that were already captured", async () => {
    const captureSpy = Sentry.captureException as unknown as ReturnType<typeof vi.fn>;
    captureSpy.mockClear();
    mockFetch.mockResolvedValue(createErrorResponse(500, "Internal Server Error"));

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Test");
    });

    expect(captureSpy).toHaveBeenCalledTimes(1);
  });

  it("should not report user-initiated aborts to Sentry", async () => {
    const captureSpy = Sentry.captureException as unknown as ReturnType<typeof vi.fn>;
    captureSpy.mockClear();
    const abortError = new DOMException("Aborted", "AbortError");
    mockFetch.mockResolvedValue(createDroppedStreamResponse(abortError));

    const { result } = renderHook(() => useAgentStream(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Test");
    });

    expect(captureSpy).not.toHaveBeenCalled();
  });
});
