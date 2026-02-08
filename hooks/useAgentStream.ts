"use client";

import { useCallback, useRef } from "react";
import { type ChatMessage, type ToolResultData, useAgentChatStore } from "@/store/agentChat";
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
        data += line.slice(6);
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
  const {
    addMessage,
    updateLastAssistantMessage,
    finalizeLastAssistantMessage,
    updateLastAssistantToolResult,
    updateMessageToolResultStatus,
    setStreaming,
    setError,
    agentContext,
  } = useAgentChatStore();

  const abortRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef("");

  const sendMessage = useCallback(
    async (userMessage: string) => {
      const conversationHistory = buildConversationHistory(useAgentChatStore.getState().messages);

      // Add user message to chat
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
        timestamp: Date.now(),
      };
      addMessage(userMsg);

      // Create placeholder for assistant response
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      };
      addMessage(assistantMsg);

      setStreaming(true);
      setError(null);
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
            ...(agentContext ?? {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP ${response.status}`);
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
                  updateLastAssistantMessage(streamingContentRef.current);
                }
                break;
              }
              case "assistant": {
                const text = extractTextFromAssistantMessage(event);
                if (text) {
                  streamingContentRef.current = text;
                  updateLastAssistantMessage(text);
                }
                break;
              }
              case "tool_result": {
                const toolName = event.tool_name as string;
                const resultData = event.result as Record<string, unknown> | undefined;
                if (toolName?.startsWith("preview_")) {
                  updateLastAssistantToolResult({
                    type: "preview",
                    toolName,
                    data: resultData ?? {},
                    status: "pending",
                  });
                }
                break;
              }
              case "result": {
                // Query finished — handle errors or success
                if (event.is_error) {
                  const errors = event.errors as string[] | undefined;
                  setError(errors?.join(", ") ?? "Agent query failed");
                }
                break;
              }
            }
          }
        }

        // Streaming ended — mark last assistant message as finalized
        finalizeLastAssistantMessage();
      } catch (err: unknown) {
        finalizeLastAssistantMessage();
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — not an error
          return;
        }
        const msg = err instanceof Error ? err.message : "Failed to connect to agent";
        setError(msg);
      } finally {
        setStreaming(false);
      }
    },
    [
      addMessage,
      updateLastAssistantMessage,
      finalizeLastAssistantMessage,
      updateLastAssistantToolResult,
      setStreaming,
      setError,
      agentContext,
    ]
  );

  const sendConfirmation = useCallback(
    async (messageId: string, toolName: string, approved: boolean) => {
      updateMessageToolResultStatus(messageId, approved ? "approved" : "denied");

      const message = approved
        ? `I approve the proposed changes from ${toolName}. Please proceed with the commit.`
        : `I reject the proposed changes from ${toolName}. Do not apply them.`;

      await sendMessage(message);
    },
    [updateMessageToolResultStatus, sendMessage]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, sendConfirmation, abort };
}
