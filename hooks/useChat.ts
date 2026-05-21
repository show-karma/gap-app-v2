"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { aiAgentClient, type TeamRole } from "@/lib/ai-agent-client";
import { humanizeApiError } from "@/lib/ai-agent-error";

export interface ChatToolActivity {
  id: string;
  tool: string;
  preview?: string;
  state: "running" | "completed" | "error";
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  runId?: string;
  tools?: ChatToolActivity[];
  state: "streaming" | "complete" | "error" | "cancelled";
  errorMessage?: string;
}

interface SseEvent {
  event: string;
  run_id: string;
  timestamp?: number;
  delta?: string;
  tool?: string;
  preview?: string;
  duration?: number;
  error?: boolean;
  message?: string;
}

// Naive line-buffered SSE parser. fetch().body is a ReadableStream of bytes;
// we accumulate into a string and emit one parsed event per blank-line chunk.
async function* iterSseEvents(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal.aborted) {
      try {
        await reader.cancel();
      } catch {
        /* already torn down */
      }
      return;
    }
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events end on a blank line ("\n\n"). Parse complete frames out
    // of the buffer; keep any partial frame for the next read.
    let separatorIdx = buffer.indexOf("\n\n");
    while (separatorIdx !== -1) {
      const frame = buffer.slice(0, separatorIdx);
      buffer = buffer.slice(separatorIdx + 2);
      const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
      if (dataLine) {
        try {
          yield JSON.parse(dataLine.slice(5).trim()) as SseEvent;
        } catch {
          /* malformed frame — skip */
        }
      }
      separatorIdx = buffer.indexOf("\n\n");
    }
  }
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useChat(slug: string | undefined, role: TeamRole) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Use refs for transient state that should not cause dep-array churn.
  const sendingRef = useRef(false);
  const activeRunIdRef = useRef<string | null>(null);
  // Expose as state only for re-render triggers (UI needs to reflect these).
  const [sending, setSending] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const previousResponseRef = useRef<string | undefined>(undefined);

  // Cancel any in-flight stream on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!slug || !text.trim() || sendingRef.current) return;

      const userMessage: ChatMessage = {
        id: makeId(),
        role: "user",
        content: text.trim(),
        state: "complete",
      };
      const assistantId = makeId();
      const placeholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        tools: [],
        state: "streaming",
      };

      sendingRef.current = true;
      setSending(true);
      setMessages((s) => [...s, userMessage, placeholder]);

      try {
        // 1. Start a run on the gap-indexer chat proxy.
        const { runId } = await aiAgentClient.startChat(
          slug,
          role,
          text.trim(),
          previousResponseRef.current
        );
        previousResponseRef.current = runId;
        activeRunIdRef.current = runId;
        setActiveRunId(runId);
        setMessages((s) => s.map((m) => (m.id === assistantId ? { ...m, runId } : m)));

        // 2. Open the authenticated SSE event stream.
        const controller = new AbortController();
        abortRef.current = controller;
        const body = await aiAgentClient.openChatStream(slug, role, runId, controller.signal);

        // 3. Translate SSE events into message updates.
        for await (const event of iterSseEvents(body, controller.signal)) {
          setMessages((s) =>
            s.map((m) => (m.id === assistantId ? applyEventToMessage(m, event) : m))
          );
          if (event.event === "run.completed" || event.event === "run.failed") {
            break;
          }
        }
      } catch (err) {
        const wasCancelled = err instanceof DOMException && err.name === "AbortError";
        setMessages((s) =>
          s.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  state: wasCancelled ? "cancelled" : "error",
                  errorMessage: wasCancelled
                    ? undefined
                    : humanizeApiError(err, "Your team couldn't reply. Try again."),
                }
              : m
          )
        );
      } finally {
        sendingRef.current = false;
        activeRunIdRef.current = null;
        setSending(false);
        setActiveRunId(null);
        setMessages((s) =>
          s.map((m) =>
            m.id === assistantId && m.state === "streaming" ? { ...m, state: "complete" } : m
          )
        );
        abortRef.current = null;
      }
    },
    // sendingRef and activeRunIdRef are refs — excluded from deps intentionally.
    [role, slug]
  );

  const stop = useCallback(async () => {
    if (!slug || !activeRunIdRef.current) return;
    try {
      await aiAgentClient.stopChatRun(slug, role, activeRunIdRef.current);
    } catch {
      // Even if the upstream stop fails, abort the local stream.
    }
    abortRef.current?.abort();
  }, [role, slug]);

  return {
    messages,
    sending,
    activeRunId,
    send,
    stop,
  };
}

function applyEventToMessage(message: ChatMessage, event: SseEvent): ChatMessage {
  switch (event.event) {
    case "message.delta":
      return {
        ...message,
        content: `${message.content}${event.delta ?? ""}`,
      };
    case "tool.started":
      return {
        ...message,
        tools: [
          ...(message.tools ?? []),
          {
            id: `${event.tool}-${event.timestamp ?? Date.now()}`,
            tool: event.tool ?? "tool",
            preview: event.preview,
            state: "running",
          },
        ],
      };
    case "tool.completed": {
      const tools = (message.tools ?? []).slice();
      // Match newest running entry for this tool, mark complete/error.
      for (let i = tools.length - 1; i >= 0; i -= 1) {
        if (tools[i].tool === event.tool && tools[i].state === "running") {
          tools[i] = {
            ...tools[i],
            state: event.error ? "error" : "completed",
            durationMs: event.duration ? Math.round(event.duration * 1000) : undefined,
          };
          break;
        }
      }
      return { ...message, tools };
    }
    case "run.completed":
      return { ...message, state: "complete" };
    case "run.failed":
      return {
        ...message,
        state: "error",
        errorMessage: "Your team couldn't reply. Try again.",
      };
    default:
      return message;
  }
}
