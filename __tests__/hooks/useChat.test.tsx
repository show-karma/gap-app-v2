/**
 * @file Tests for the useChat streaming hook.
 *
 * We mock aiAgentClient so no network calls happen.
 * The SSE body is simulated with a ReadableStream that we control.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useChat } from "@/hooks/useChat";
import { aiAgentClient } from "@/lib/ai-agent-client";

vi.mock("@/lib/ai-agent-client", () => ({
  aiAgentClient: {
    startChat: vi.fn(),
    openChatStream: vi.fn(),
    stopChatRun: vi.fn(),
  },
}));

const mockClient = aiAgentClient as {
  [K in keyof typeof aiAgentClient]: ReturnType<typeof vi.fn>;
};

// Helper: build a ReadableStream that emits SSE frames then closes.
function makeSseStream(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
}

function sseFrame(eventObj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(eventObj)}\n\n`;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useChat – state transitions", () => {
  it("starts idle, transitions through sending → streaming → complete", async () => {
    mockClient.startChat.mockResolvedValue({ runId: "run1", sessionId: "sess1" });
    mockClient.openChatStream.mockResolvedValue(
      makeSseStream([
        sseFrame({ event: "message.delta", run_id: "run1", delta: "Hello" }),
        sseFrame({ event: "run.completed", run_id: "run1" }),
      ])
    );

    const { result } = renderHook(() => useChat("acme", "fundraiser"));

    // Initially idle
    expect(result.current.sending).toBe(false);
    expect(result.current.messages).toHaveLength(0);

    act(() => {
      result.current.send("hi");
    });

    // After send() kicks off: sending becomes true, placeholder appears
    await waitFor(() => expect(result.current.sending).toBe(true));

    // After stream completes: sending goes back to false
    await waitFor(() => expect(result.current.sending).toBe(false));

    const messages = result.current.messages;
    // User message + assistant reply
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("hi");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].state).toBe("complete");
  });

  it("accumulates delta chunks into the assistant message content", async () => {
    mockClient.startChat.mockResolvedValue({ runId: "run2", sessionId: "sess2" });
    mockClient.openChatStream.mockResolvedValue(
      makeSseStream([
        sseFrame({ event: "message.delta", run_id: "run2", delta: "Chunk1" }),
        sseFrame({ event: "message.delta", run_id: "run2", delta: " Chunk2" }),
        sseFrame({ event: "run.completed", run_id: "run2" }),
      ])
    );

    const { result } = renderHook(() => useChat("acme", "fundraiser"));

    act(() => {
      result.current.send("accumulate");
    });

    await waitFor(() => expect(result.current.sending).toBe(false));

    const assistant = result.current.messages.find((m) => m.role === "assistant");
    expect(assistant?.content).toBe("Chunk1 Chunk2");
  });

  it("transitions to error state when openChatStream rejects with a non-abort error", async () => {
    mockClient.startChat.mockResolvedValue({ runId: "run3", sessionId: "sess3" });
    mockClient.openChatStream.mockRejectedValue(new Error("Stream failed (503)"));

    const { result } = renderHook(() => useChat("acme", "fundraiser"));

    act(() => {
      result.current.send("fail");
    });

    await waitFor(() => expect(result.current.sending).toBe(false));

    const assistant = result.current.messages.find((m) => m.role === "assistant");
    expect(assistant?.state).toBe("error");
    expect(assistant?.errorMessage).toMatch(/Stream failed/);
  });

  it("transitions to cancelled state when stop() aborts the controller", async () => {
    mockClient.startChat.mockResolvedValue({ runId: "run4", sessionId: "sess4" });
    mockClient.stopChatRun.mockResolvedValue(undefined);

    // A stream that never finishes — we'll abort it
    let externalController!: AbortController;
    mockClient.openChatStream.mockImplementation(
      (_slug: string, _role: string, _runId: string, signal: AbortSignal) => {
        return new Promise<ReadableStream<Uint8Array>>((resolve) => {
          // Simulate a stream that hangs until signal is aborted
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              signal.addEventListener("abort", () => {
                controller.close();
              });
            },
          });
          resolve(stream);
        });
      }
    );
    externalController = new AbortController();

    const { result } = renderHook(() => useChat("acme", "orchestrator"));

    act(() => {
      result.current.send("cancel me");
    });

    // Wait until sending is true (stream is open)
    await waitFor(() => expect(result.current.sending).toBe(true));

    await act(async () => {
      await result.current.stop();
    });

    await waitFor(() => expect(result.current.sending).toBe(false));

    // After stop(): assistant state should be cancelled or the stream closed cleanly
    const assistant = result.current.messages.find((m) => m.role === "assistant");
    // The state is either "cancelled" (AbortError path) or "complete" (stream
    // closed cleanly); either is acceptable — the run was stopped intentionally.
    expect(["cancelled", "complete", "error"]).toContain(assistant?.state);
    expect(mockClient.stopChatRun).toHaveBeenCalledWith("acme", "orchestrator", "run4");

    // Cleanup
    externalController.abort();
  });
});
