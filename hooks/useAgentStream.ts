"use client";

import * as Sentry from "@sentry/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { type ChatMessage, useAgentChatStore } from "@/store/agentChat";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { PAGES } from "@/utilities/pages";
import { createProjectQueryPredicate } from "@/utilities/queryKeys";

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

function extractToolResultData(raw: unknown): Record<string, unknown> {
  const blocks = Array.isArray(raw) ? raw : (raw as Record<string, unknown>)?.content;
  if (Array.isArray(blocks)) {
    const textBlock = blocks.find(
      (b: Record<string, unknown>) => b.type === "text" && typeof b.text === "string"
    );
    if (textBlock) {
      try {
        return JSON.parse(textBlock.text);
      } catch {
        /* fall through */
      }
    }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function toFriendlyError(status: number, rawMessage: unknown): string {
  const msg = typeof rawMessage === "string" ? rawMessage.trim() : "";
  const isRawStatusCode = !msg || msg.startsWith("HTTP ");
  switch (status) {
    case 429:
      return "I'm getting a lot of requests right now. Please wait a moment and try again.";
    case 503:
      return "I'm temporarily unavailable. Please try again in a few minutes.";
    case 403:
      // 403 can mean budget exceeded OR access denied — use the backend's
      // message since it's already user-friendly (e.g., "Daily agent usage
      // budget exceeded. Please try again tomorrow.")
      return isRawStatusCode
        ? "I'm unable to help with that right now. Please try again later."
        : msg;
    default:
      if (status >= 500) {
        return "Something went wrong on my end. Please try again.";
      }
      return isRawStatusCode ? "Something unexpected happened. Please try again." : msg;
  }
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
  const queryClient = useQueryClient();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef("");
  const newSlugRef = useRef<string | null>(null);

  // Read state fresh via getState() inside callbacks instead of subscribing
  // to all store changes. Actions are stable refs; state values (messages,
  // agentContext) are read at call-time to avoid stale closures.
  const sendMessage = useCallback(
    async (userMessage: string) => {
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
      newSlugRef.current = null;

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
          let errorMsg = toFriendlyError(response.status, `HTTP ${response.status}`);
          try {
            const errorJson = JSON.parse(errorText) as {
              message?: unknown;
              error?: unknown;
            };
            const rawMsg =
              typeof errorJson.message === "string"
                ? errorJson.message
                : typeof errorJson.error === "string"
                  ? errorJson.error
                  : "";
            if (rawMsg.trim()) {
              errorMsg = toFriendlyError(response.status, rawMsg.trim());
            }
          } catch {
            const rawMsg = errorText.trim();
            if (rawMsg) {
              errorMsg = toFriendlyError(response.status, rawMsg);
            }
          }
          Sentry.captureException(new Error(`Agent stream error: HTTP ${response.status}`), {
            extra: { status: response.status, errorText, errorMsg },
          });
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
              case "system":
              case "trace_started": {
                // The backend emits `event: system / data:
                // {"type":"trace_started","traceId":"..."}`. parseSSEChunk
                // only reads the `data:` line, so what reaches us as
                // `event.type` is the JSON-data type — "trace_started"
                // for our payload and "system" for the Anthropic SDK's
                // own init event (which has no traceId). Both share the
                // SSE `event: system` line, but we dispatch on data.type.
                const traceId = event.traceId;
                if (typeof traceId === "string" && traceId) {
                  store.setLastAssistantTraceId(traceId);
                }
                break;
              }
              case "tool_result": {
                const toolName = event.tool_name as string;
                const resultData = extractToolResultData(event.result);
                if (toolName?.startsWith("preview_")) {
                  store.updateLastAssistantToolResult({
                    type: "preview",
                    toolName,
                    data: resultData,
                    status: "pending",
                  });
                }
                if (
                  toolName === "commit_update_project" &&
                  typeof resultData.newSlug === "string"
                ) {
                  newSlugRef.current = resultData.newSlug;
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

        // Invalidate caches if any write tool was approved during this conversation
        const currentMessages = useAgentChatStore.getState().messages;
        const hasApprovedWrite = currentMessages.some((m) => m.toolResult?.status === "approved");
        if (hasApprovedWrite) {
          const ctx = useAgentChatStore.getState().agentContext;
          if (ctx?.projectId) {
            queryClient.invalidateQueries({
              predicate: createProjectQueryPredicate(ctx.projectId),
            });
            if (newSlugRef.current && newSlugRef.current !== ctx.projectId) {
              router.replace(PAGES.PROJECT.OVERVIEW(newSlugRef.current));
            }
          }
          if (ctx?.programId) {
            queryClient.invalidateQueries({ queryKey: ["program", ctx.programId] });
          }
        }
      } catch (err: unknown) {
        useAgentChatStore.getState().finalizeLastAssistantMessage();
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — not an error
          return;
        }
        let msg = err instanceof Error ? err.message : "Failed to connect to agent";
        if (err instanceof TypeError && msg === "Failed to fetch") {
          msg = "Unable to reach the server. Please check your connection and try again.";
        }
        useAgentChatStore.getState().setError(msg);
      } finally {
        useAgentChatStore.getState().setStreaming(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- router excluded per project anti-patterns (new object each render)
    },
    [queryClient]
  );

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
