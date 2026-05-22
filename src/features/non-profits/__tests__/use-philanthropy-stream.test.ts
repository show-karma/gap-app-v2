/**
 * Unit tests for non-profits/hooks/use-philanthropy-stream.ts
 *
 * Tests the raw SSE parsing and abort path via streamPhilanthropyQuery.
 * fetch is mocked to return a ReadableStream of SSE frames.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { streamPhilanthropyQuery } from "../hooks/use-philanthropy-stream";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.test",
  },
}));

// ── SSE stream builder helpers ────────────────────────────────────────────────

function encodeSSEFrame(event: string, data: unknown): Uint8Array {
  const json = JSON.stringify(data);
  const text = `event: ${event}\ndata: ${json}\n\n`;
  return new TextEncoder().encode(text);
}

function makeSSEStream(frames: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(frame);
      }
      controller.close();
    },
  });
}

function makeResponse(stream: ReadableStream<Uint8Array>, ok = true, status = 200): Response {
  return {
    ok,
    status,
    body: stream,
    text: () => Promise.resolve(""),
  } as unknown as Response;
}

const FINAL_ANSWER_PAYLOAD = {
  answer: "Grant search result.",
  summary: null,
  plan: null,
  evidence: [],
  citations: [],
  traceId: "trace-abc-123",
  execution: {
    toolCalls: 2,
    durationMs: 1500,
    partial: false,
    stoppedReason: null,
  },
  entities: [],
  assumptions: {},
  attachments: [],
};

const NO_OP_CALLBACKS = {
  onHeader: vi.fn(),
  onNarrative: vi.fn(),
  onProgress: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("streamPhilanthropyQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves with header and narrative on a valid final_answer event", async () => {
    const stream = makeSSEStream([encodeSSEFrame("final_answer", FINAL_ANSWER_PAYLOAD)]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(stream)));

    const controller = new AbortController();
    const result = await streamPhilanthropyQuery(
      "test query",
      undefined,
      1,
      controller.signal,
      true,
      undefined,
      undefined,
      NO_OP_CALLBACKS
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.header.traceId).toBe("trace-abc-123");
      expect(result.value.narrative).toBe("Grant search result.");
    }
    expect(NO_OP_CALLBACKS.onHeader).toHaveBeenCalledTimes(1);
    expect(NO_OP_CALLBACKS.onNarrative).toHaveBeenCalledWith("Grant search result.");
  });

  it("returns AbortError when the signal is aborted", async () => {
    const controller = new AbortController();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(new DOMException("Aborted", "AbortError"));
      })
    );

    const result = await streamPhilanthropyQuery(
      "aborted query",
      undefined,
      1,
      controller.signal,
      true,
      undefined,
      undefined,
      NO_OP_CALLBACKS
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("AbortError");
    }
  });

  it("returns StreamError when the stream closes without final_answer", async () => {
    // Empty stream — no frames
    const stream = makeSSEStream([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(stream)));

    const controller = new AbortController();
    const result = await streamPhilanthropyQuery(
      "empty stream",
      undefined,
      1,
      controller.signal,
      true,
      undefined,
      undefined,
      NO_OP_CALLBACKS
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("StreamError");
    }
  });

  it("returns StreamError on an SSE error event", async () => {
    const stream = makeSSEStream([encodeSSEFrame("error", { message: "Agent failed internally" })]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(stream)));

    const controller = new AbortController();
    const result = await streamPhilanthropyQuery(
      "error stream",
      undefined,
      1,
      controller.signal,
      true,
      undefined,
      undefined,
      NO_OP_CALLBACKS
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("StreamError");
      expect((result.error as { message: string }).message).toBe("Agent failed internally");
    }
  });

  it("returns ApiError on HTTP 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve(""),
      } as unknown as Response)
    );

    const controller = new AbortController();
    const result = await streamPhilanthropyQuery(
      "rate limited",
      undefined,
      1,
      controller.signal,
      true,
      undefined,
      undefined,
      NO_OP_CALLBACKS
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("ApiError");
      expect((result.error as { status: number }).status).toBe(429);
    }
  });

  it("calls onProgress for tool_progress started events", async () => {
    const toolStartedFrame = encodeSSEFrame("tool_progress", {
      tool: "search_grants",
      toolUseId: "tu-1",
      status: "started",
    });
    const stream = makeSSEStream([
      toolStartedFrame,
      encodeSSEFrame("final_answer", FINAL_ANSWER_PAYLOAD),
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(stream)));

    const onProgress = vi.fn();
    const controller = new AbortController();
    const result = await streamPhilanthropyQuery(
      "tools query",
      undefined,
      1,
      controller.signal,
      true,
      undefined,
      undefined,
      { onHeader: vi.fn(), onNarrative: vi.fn(), onProgress }
    );

    expect(result.isOk()).toBe(true);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "tool_started", tool: "search_grants" })
    );
  });

  it("calls onProgress for matched_entities events", async () => {
    const matchedFrame = encodeSSEFrame("matched_entities", {
      names: ["MacArthur Foundation", "Ford Foundation"],
    });
    const stream = makeSSEStream([
      matchedFrame,
      encodeSSEFrame("final_answer", FINAL_ANSWER_PAYLOAD),
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(stream)));

    const onProgress = vi.fn();
    const controller = new AbortController();
    await streamPhilanthropyQuery(
      "matched entities query",
      undefined,
      1,
      controller.signal,
      true,
      undefined,
      undefined,
      { onHeader: vi.fn(), onNarrative: vi.fn(), onProgress }
    );

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "matched_entities",
        names: ["MacArthur Foundation", "Ford Foundation"],
      })
    );
  });

  it("returns NetworkError on fetch TypeError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const controller = new AbortController();
    const result = await streamPhilanthropyQuery(
      "network fail",
      undefined,
      1,
      controller.signal,
      true,
      undefined,
      undefined,
      NO_OP_CALLBACKS
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("NetworkError");
    }
  });

  it("does not call onNarrative when includeNarrative=false", async () => {
    const stream = makeSSEStream([encodeSSEFrame("final_answer", FINAL_ANSWER_PAYLOAD)]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(stream)));

    const onNarrative = vi.fn();
    const controller = new AbortController();
    await streamPhilanthropyQuery(
      "no narrative",
      undefined,
      1,
      controller.signal,
      false, // includeNarrative = false
      undefined,
      undefined,
      { onHeader: vi.fn(), onNarrative, onProgress: vi.fn() }
    );

    expect(onNarrative).not.toHaveBeenCalled();
  });
});
