"use client";

import { useCallback, useRef } from "react";
import { type ChatMessage, useAgentChatStore } from "@/store/agentChat";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";

interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

function parseSSEChunk(chunk: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const blocks = chunk.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    let data = "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        // Per SSE spec, multiple data: lines are joined with newline separators
        data += (data ? "\n" : "") + line.slice(6);
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

function extractTextFromAssistantMessage(event: SSEEvent): string {
  const message = event.message as Record<string, unknown> | undefined;
  if (!message?.content) return "";
  const contentBlocks = message.content as Array<{ type: string; text?: string }>;
  return contentBlocks
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("");
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

function buildConversationHistory(
  messages: ChatMessage[],
  maxMessages: number = 12
): Array<{ role: string; content: string }> {
  return messages
    .filter((msg) => msg.content && msg.content.trim().length > 0)
    .slice(-maxMessages)
    .map((msg) => ({ role: msg.role, content: msg.content }));
}

export function useAgentStream() {
  const abortRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef("");

  // Read state fresh via getState() inside callbacks instead of subscribing
  // to all store changes. Actions are stable refs; state values (messages,
  // agentContext) are read at call-time to avoid stale closures.
  const sendMessage = useCallback(async (userMessage: string) => {
    const store = useAgentChatStore.getState();
    const conversationHistory = buildConversationHistory(store.messages);

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    };
    store.addMessage(userMsg);

    // Create placeholder for assistant response
    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };
    store.addMessage(assistantMsg);

    store.setStreaming(true);
    store.setError(null);
    streamingContentRef.current = "";

    // Abort any previous stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await TokenManager.getToken();
      const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/agent/stream`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          ...(conversationHistory.length > 0 ? { conversationHistory } : {}),
          ...(store.agentContext ?? {}),
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
        if (response.status === 409) {
          throw new Error(
            "Please wait for your current request to complete before sending another."
          );
        }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = parseSSEChunk(buffer);

        // Keep unprocessed remainder in buffer
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
            case "tool_result": {
              const toolName = event.tool_name as string;
              const resultData = event.result as Record<string, unknown> | undefined;
              if (toolName?.startsWith("preview_")) {
                store.updateLastAssistantToolResult({
                  type: "preview",
                  toolName,
                  data: resultData ?? {},
                  status: "pending",
                });
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
              // Query finished — handle errors or success
              if (event.is_error) {
                const errors = event.errors as string[] | undefined;
                store.setError(errors?.join(", ") ?? "Agent query failed");
              }
              break;
            }
          }
        }
      }

      // Streaming ended — mark last assistant message as finalized
      store.finalizeLastAssistantMessage();
    } catch (err: unknown) {
      useAgentChatStore.getState().finalizeLastAssistantMessage();
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — not an error
        return;
      }
      const msg = err instanceof Error ? err.message : "Failed to connect to agent";
      useAgentChatStore.getState().setError(msg);
    } finally {
      useAgentChatStore.getState().setStreaming(false);
    }
  }, []);

  const sendConfirmation = useCallback(
    async (messageId: string, toolName: string, approved: boolean) => {
      useAgentChatStore
        .getState()
        .updateMessageToolResultStatus(messageId, approved ? "approved" : "denied");

      const message = approved
        ? `I approve the proposed changes from ${toolName}. Please proceed with the commit.`
        : `I reject the proposed changes from ${toolName}. Do not apply them.`;

      await sendMessage(message);
    },
    [sendMessage]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, sendConfirmation, abort };
}
