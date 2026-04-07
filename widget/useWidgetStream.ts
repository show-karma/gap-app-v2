import { useCallback, useRef } from "react";
import { type ChatMessage, useAgentChatStore } from "@/store/agentChat";

interface WidgetStreamConfig {
  apiUrl: string;
  communityId: string;
}

interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

function parseSSEChunk(chunk: string): SSEEvent[] {
  const normalized = chunk.replace(/\r\n/g, "\n");
  const events: SSEEvent[] = [];
  const blocks = normalized.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    let data = "";

    for (const line of lines) {
      if (line.startsWith("data:")) {
        data += (data ? "\n" : "") + line.slice(5).trimStart();
      }
    }

    if (data) {
      try {
        events.push(JSON.parse(data));
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return events;
}

function extractDeltaText(event: SSEEvent): string {
  const streamEvent = event.event as Record<string, unknown> | undefined;
  if (!streamEvent) return "";

  if (streamEvent.type === "content_block_delta") {
    const delta = streamEvent.delta as { type?: string; text?: string } | undefined;
    if (delta?.type === "text_delta" && delta.text) {
      return delta.text;
    }
  }
  return "";
}

function extractTextFromAssistantMessage(event: SSEEvent): string {
  const message = event.message as Record<string, unknown> | undefined;
  if (!message?.content) return "";
  const contentBlocks = message.content as Array<{ type: string; text?: string }>;
  return contentBlocks
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("");
}

function buildConversationHistory(
  messages: ChatMessage[],
  maxMessages = 12
): Array<{ role: string; content: string }> {
  return messages
    .filter((msg) => msg.content && msg.content.trim().length > 0)
    .slice(-maxMessages)
    .map((msg) => ({ role: msg.role, content: msg.content }));
}

// Module-level ref so destroy() can abort in-flight streams after React unmounts
let activeController: AbortController | null = null;

/** Abort any in-flight widget stream. Safe to call from outside React. */
export function abortWidgetStream() {
  activeController?.abort();
  activeController = null;
}

export function useWidgetStream({ apiUrl, communityId }: WidgetStreamConfig) {
  const streamingContentRef = useRef("");

  const sendMessage = useCallback(
    async (userMessage: string) => {
      const store = useAgentChatStore.getState();
      const conversationHistory = buildConversationHistory(store.messages);

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
        timestamp: Date.now(),
      };
      store.addMessage(userMsg);

      store.setStreaming(true);
      store.setError(null);
      streamingContentRef.current = "";

      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            communityId,
            ...(conversationHistory.length > 0 ? { conversationHistory } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMsg = `HTTP ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMsg = errorJson.message || errorJson.error || errorMsg;
          } catch {
            if (errorText) errorMsg = errorText;
          }
          throw new Error(errorMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        // Add assistant placeholder only after stream is confirmed
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          isStreaming: true,
        };
        store.addMessage(assistantMsg);

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = parseSSEChunk(buffer);

          const lastNewlines = buffer.lastIndexOf("\n\n");
          if (lastNewlines >= 0) {
            buffer = buffer.slice(lastNewlines + 2);
          }

          for (const event of events) {
            switch (event.type) {
              case "stream_event": {
                const delta = extractDeltaText(event);
                if (delta) {
                  streamingContentRef.current += delta;
                  store.updateLastAssistantMessage(streamingContentRef.current);
                }
                break;
              }
              case "assistant": {
                const text = extractTextFromAssistantMessage(event);
                if (text) {
                  streamingContentRef.current = text;
                  store.updateLastAssistantMessage(text);
                }
                break;
              }
              case "error": {
                const errorMsg =
                  (event.message as string) || (event.error as string) || "Agent error";
                store.setError(errorMsg);
                break;
              }
              case "result": {
                if (event.is_error) {
                  const errors = event.errors as string[] | undefined;
                  store.setError(errors?.join(", ") ?? "Agent query failed");
                }
                break;
              }
              // tool_result events are intentionally ignored -- anonymous users
              // cannot approve/deny tool actions
            }
          }
        }

        store.finalizeLastAssistantMessage();
      } catch (err: unknown) {
        useAgentChatStore.getState().finalizeLastAssistantMessage();
        if (err instanceof DOMException && err.name === "AbortError") return;
        let msg = err instanceof Error ? err.message : "Failed to connect to agent";
        if (err instanceof TypeError && msg === "Failed to fetch") {
          msg = "Unable to reach the server. Please check your connection and try again.";
        }
        useAgentChatStore.getState().setError(msg);
      } finally {
        useAgentChatStore.getState().setStreaming(false);
      }
    },
    [apiUrl, communityId]
  );

  const abort = useCallback(() => {
    abortWidgetStream();
  }, []);

  return { sendMessage, abort };
}
