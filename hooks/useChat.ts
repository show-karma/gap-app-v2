"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hermesClient, type TeamRole } from "@/lib/hermes-client";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

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

interface State {
  messages: ChatMessage[];
  // Identifies the run currently streaming (used for stop).
  activeRunId: string | null;
  sending: boolean;
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
  const [state, setState] = useState<State>({
    messages: [],
    activeRunId: null,
    sending: false,
  });
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
      if (!slug || !text.trim() || state.sending) return;

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
      setState((s) => ({
        ...s,
        messages: [...s.messages, userMessage, placeholder],
        sending: true,
      }));

      try {
        // 1. Start a run on the gap-indexer chat proxy.
        const { runId } = await hermesClient.startChat(
          slug,
          role,
          text.trim(),
          previousResponseRef.current
        );
        previousResponseRef.current = runId;
        setState((s) => ({
          ...s,
          activeRunId: runId,
          messages: s.messages.map((m) => (m.id === assistantId ? { ...m, runId } : m)),
        }));

        // 2. Open the SSE event stream. Attach the Bearer token when we have
        //    one — the indexer's AUTH_BYPASS_FOR_TESTING path also lets dev
        //    sessions through without one, mirroring the axios client.
        const token = await TokenManager.getToken();
        const headers: Record<string, string> = {
          Accept: "text/event-stream",
        };
        if (token) {
          headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
        }
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await fetch(
          `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.HERMES.CHAT_RUN_EVENTS(slug, role, runId)}`,
          {
            method: "GET",
            headers,
            signal: controller.signal,
          }
        );
        if (!res.ok || !res.body) {
          throw new Error(`Stream failed (${res.status})`);
        }

        // 3. Translate SSE events into message updates.
        for await (const event of iterSseEvents(res.body, controller.signal)) {
          setState((s) => ({
            ...s,
            messages: s.messages.map((m) =>
              m.id === assistantId ? applyEventToMessage(m, event) : m
            ),
          }));
          if (event.event === "run.completed" || event.event === "run.failed") {
            break;
          }
        }
      } catch (err) {
        const wasCancelled = err instanceof DOMException && err.name === "AbortError";
        setState((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  state: wasCancelled ? "cancelled" : "error",
                  errorMessage: wasCancelled
                    ? undefined
                    : err instanceof Error
                      ? err.message
                      : "Stream failed",
                }
              : m
          ),
        }));
      } finally {
        setState((s) => ({
          ...s,
          sending: false,
          activeRunId: null,
          messages: s.messages.map((m) =>
            m.id === assistantId && m.state === "streaming" ? { ...m, state: "complete" } : m
          ),
        }));
        abortRef.current = null;
      }
    },
    [role, slug, state.sending]
  );

  const stop = useCallback(async () => {
    if (!slug || !state.activeRunId) return;
    try {
      await hermesClient.stopChatRun(slug, role, state.activeRunId);
    } catch {
      // Even if the upstream stop fails, abort the local stream.
    }
    abortRef.current?.abort();
  }, [role, slug, state.activeRunId]);

  return {
    messages: state.messages,
    sending: state.sending,
    activeRunId: state.activeRunId,
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
        errorMessage: event.message ?? "Run failed",
      };
    default:
      return message;
  }
}
