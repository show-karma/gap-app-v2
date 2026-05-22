/**
 * SSE-streaming philanthropy search hook — ported from
 * grant-atlas features/grant-atlas/hooks/use-philanthropy-stream.ts.
 *
 * Key adaptations from grant-atlas:
 * - Store: useGrantAtlasStore → usePhilanthropyStore (gap-app-v2 store)
 * - Session store: useSearchSessionStore from ../store/search-session
 * - Stream endpoint is PUBLIC — no auth header on the SSE request itself
 * - AbortError is silently swallowed (no error card shown)
 * - On stream close without final_answer → StreamError message in turn (no retry)
 */
import { ResultAsync } from "neverthrow";
import { useCallback, useRef } from "react";
import { z } from "zod";
import { envVars } from "@/utilities/enviromentVars";
import {
  type AgentAttachment,
  AgenticQueryResponseSchema,
  agenticResponseToQueryResponse,
  type SearchSortKey,
} from "../lib/agentic-philanthropy";
import { NON_PROFITS_API } from "../lib/api";
import type { AppError } from "../lib/errors";
import { type ChatTurn, usePhilanthropyStore } from "../store/philanthropy";
import { useSearchSessionStore } from "../store/search-session";
import type {
  QueryIntent,
  QueryPagination,
  QueryResponse,
  RankedEntity,
} from "../types/philanthropy";
import { useAddSearchHistory } from "./use-search-history";

const DEFAULT_PAGE_SIZE = 500;

interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

function parseSSEBlocks(blocks: string[]): SSEEvent[] {
  const events: SSEEvent[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    let eventName = "message";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventName = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        data += (data ? "\n" : "") + line.slice(6);
      }
    }

    if (!data) continue;

    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      events.push({ event: eventName, data: parsed });
    } catch {
      // Skip malformed JSON silently
    }
  }

  return events;
}

function toFriendlyError(status: number): string {
  switch (status) {
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 503:
      return "Service temporarily unavailable. Please try again in a few minutes.";
    default:
      if (status >= 500) return "Something went wrong. Please try again.";
      return "Something unexpected happened. Please try again.";
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  const fallback = toFriendlyError(response.status);
  try {
    const errorText = await response.text();
    if (!errorText.trim()) return fallback;
    try {
      const errorJson = JSON.parse(errorText) as {
        message?: string;
        error?: string;
      };
      const rawMsg = errorJson.message ?? errorJson.error;
      return rawMsg?.trim() ? rawMsg.trim() : fallback;
    } catch {
      return errorText.trim();
    }
  } catch {
    return fallback;
  }
}

const ErrorEventSchema = z.object({
  message: z.string().optional(),
});

interface StreamHeader {
  entities: RankedEntity[];
  pagination: QueryPagination;
  citations: QueryResponse["citations"];
  intent: QueryIntent;
  traceId: string | null;
  attachments: AgentAttachment[];
}

interface StreamResult {
  header: StreamHeader;
  narrative: string;
}

/** Live event payloads surfaced from the SSE stream while the agent runs. */
export interface StreamProgressEvent {
  kind:
    | "interpreted_query"
    | "assistant_text"
    | "tool_started"
    | "tool_completed"
    | "tool_failed"
    | "matched_entities"
    | "assumptions"
    | "evidence_progress";
  /** Tool name when kind starts with "tool_". */
  tool?: string;
  /** Stable per-call id for tool events; correlate started/completed pairs. */
  toolUseId?: string;
  /** Duration on tool_completed/failed. */
  durationMs?: number | null;
  /** Reasoning/narration text on assistant_text. */
  text?: string;
  /** Names on matched_entities. */
  names?: string[];
  /** Counts on evidence_progress. */
  evidenceCount?: number;
  citationCount?: number;
}

interface StreamCallbacks {
  onHeader: (header: StreamHeader) => void;
  onNarrative: (text: string) => void;
  /** Called for every progress event emitted before final_answer. */
  onProgress: (event: StreamProgressEvent) => void;
}

/**
 * Conversation message for multi-turn chat history.
 *
 * The indexer accepts the full `messages` array so it can resolve follow-up
 * references ("narrow that to Texas") against prior assistant outputs.
 */
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export function streamPhilanthropyQuery(
  query: string,
  messages: ConversationMessage[] | undefined,
  page: number,
  signal: AbortSignal,
  includeNarrative: boolean,
  sort: SearchSortKey | undefined,
  entityTypes: string[] | undefined,
  callbacks: StreamCallbacks
): ResultAsync<StreamResult, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${NON_PROFITS_API.PHILANTHROPY.QUERY_STREAM}`;
      const body: Record<string, unknown> = {
        message: query,
        page,
        limit: DEFAULT_PAGE_SIZE,
        includeNarrative,
        includeEvidence: true,
      };
      // Send conversation history for multi-turn context. Indexer revs that
      // don't yet read this field will ignore it and fall back to `message`.
      if (messages && messages.length > 0) {
        body.messages = messages;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response);
        const apiErr: AppError = { type: "ApiError", status: response.status, message };
        throw apiErr;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const streamErr: AppError = {
          type: "StreamError",
          message: "Streaming response is not readable in this environment.",
        };
        throw streamErr;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let header: StreamHeader | null = null;
      let narrative = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lastFrameEnd = buffer.lastIndexOf("\n\n");
        if (lastFrameEnd < 0) continue;

        const consumable = buffer.slice(0, lastFrameEnd);
        buffer = buffer.slice(lastFrameEnd + 2);

        const blocks = consumable.split("\n\n").filter(Boolean);
        const events = parseSSEBlocks(blocks);

        for (const event of events) {
          if (event.event === "final_answer") {
            const parsed = AgenticQueryResponseSchema.safeParse(event.data);
            if (parsed.success) {
              const mapped = agenticResponseToQueryResponse(parsed.data, {
                page,
                limit: DEFAULT_PAGE_SIZE,
                sort,
                entityTypes,
              });
              header = {
                entities: mapped.entities,
                pagination: mapped.pagination,
                citations: mapped.citations,
                intent: mapped.intent,
                traceId: mapped.traceId,
                attachments: parsed.data.attachments ?? [],
              };
              narrative = mapped.narrative ?? "";
              callbacks.onHeader(header);
              if (includeNarrative) {
                callbacks.onNarrative(narrative);
              }
            }
          } else if (event.event === "error") {
            const parsed = ErrorEventSchema.safeParse(event.data);
            const message =
              parsed.success && parsed.data.message ? parsed.data.message : "Search failed";
            const streamErr: AppError = { type: "StreamError", message };
            throw streamErr;
          } else {
            // Progress events — surface them so the UI can render the
            // agent's reasoning and tool activity instead of a blank spinner.
            const data = event.data as Record<string, unknown>;
            switch (event.event) {
              case "interpreted_query":
                callbacks.onProgress({ kind: "interpreted_query" });
                break;
              case "assistant_text":
                if (typeof data.text === "string") {
                  callbacks.onProgress({ kind: "assistant_text", text: data.text });
                }
                break;
              case "tool_progress": {
                const tool = typeof data.tool === "string" ? data.tool : "tool";
                const toolUseId = typeof data.toolUseId === "string" ? data.toolUseId : undefined;
                const status = data.status as string | undefined;
                const durationMs = typeof data.durationMs === "number" ? data.durationMs : null;
                if (status === "started") {
                  callbacks.onProgress({ kind: "tool_started", tool, toolUseId });
                } else if (status === "completed") {
                  callbacks.onProgress({
                    kind: "tool_completed",
                    tool,
                    toolUseId,
                    durationMs,
                  });
                } else if (status === "failed") {
                  callbacks.onProgress({
                    kind: "tool_failed",
                    tool,
                    toolUseId,
                    durationMs,
                  });
                }
                break;
              }
              case "matched_entities":
                if (Array.isArray(data.names)) {
                  callbacks.onProgress({
                    kind: "matched_entities",
                    names: data.names.filter((n): n is string => typeof n === "string"),
                  });
                }
                break;
              case "assumptions":
                callbacks.onProgress({ kind: "assumptions" });
                break;
              case "evidence_progress":
                callbacks.onProgress({
                  kind: "evidence_progress",
                  evidenceCount:
                    typeof data.evidenceCount === "number" ? data.evidenceCount : undefined,
                  citationCount:
                    typeof data.citationCount === "number" ? data.citationCount : undefined,
                });
                break;
              default:
                // Unknown event — ignore. Server can add new events without
                // breaking older clients.
                break;
            }
          }
        }
      }

      if (!header) {
        const streamErr: AppError = {
          type: "StreamError",
          message: "Stream closed before the result header arrived.",
        };
        throw streamErr;
      }

      return { header, narrative };
    })(),
    (e): AppError => {
      if (e instanceof DOMException && e.name === "AbortError") {
        return { type: "AbortError" };
      }
      if (e instanceof TypeError && e.message === "Failed to fetch") {
        return {
          type: "NetworkError",
          message: "Unable to reach the server. Please check your connection and try again.",
        };
      }
      const appErr = e as AppError;
      if (appErr && typeof appErr === "object" && "type" in appErr) {
        return appErr;
      }
      return {
        type: "StreamError",
        message: e instanceof Error ? e.message : "Failed to connect",
      };
    }
  );
}

/**
 * Builds the conversation array sent to the indexer for a chat-mode turn.
 *
 * Includes all completed prior turns as alternating user/assistant messages,
 * then appends the new user query as the final message. Streaming and errored
 * turns are skipped — they'd give the indexer half-formed context.
 */
function buildConversationMessages(
  priorTurns: ReadonlyArray<ChatTurn>,
  newUserQuery: string
): ConversationMessage[] {
  const completed = priorTurns.filter((t) => t.status === "done");
  const history: ConversationMessage[] = [];
  for (const turn of completed) {
    history.push({ role: "user", content: turn.userQuery });
    if (turn.narrative.trim()) {
      history.push({ role: "assistant", content: turn.narrative });
    }
  }
  history.push({ role: "user", content: newUserQuery });
  return history;
}

export function usePhilanthropySearch() {
  const abortRef = useRef<AbortController | null>(null);
  const addHistory = useAddSearchHistory();

  const search = useCallback(
    async (
      query: string,
      page = 1,
      options?: {
        onSearchId?: (id: string) => void;
        sort?: SearchSortKey;
        entityTypes?: string[];
        /** Chat mode: append a new turn instead of treating this as a new top-level search. */
        chat?: boolean;
      }
    ) => {
      const store = usePhilanthropyStore.getState();
      const normalizedQuery = query.trim();
      const isChat = options?.chat === true;

      // In chat mode, send the conversation history for multi-turn resolution.
      // Only include completed turns to avoid feeding it half-streamed content.
      const conversationMessages: ConversationMessage[] | undefined = isChat
        ? buildConversationMessages(store.messages, normalizedQuery)
        : undefined;

      const isSameQuery =
        !isChat &&
        store.query.trim().toLowerCase() === normalizedQuery.toLowerCase() &&
        store.result !== null;
      const currentPage = store.result?.pagination.page;
      const isPagination = isSameQuery && currentPage !== undefined && currentPage !== page;
      const isRequery = isSameQuery && !isPagination && page === 1;
      const isNewQuery = !isSameQuery;

      // Append a streaming turn for chat mode.
      let turnId: string | null = null;
      if (isChat) {
        turnId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        store.appendTurn({
          id: turnId,
          userQuery: normalizedQuery,
          narrative: "",
          entities: [],
          citations: [],
          traceId: null,
          pagination: null,
          status: "streaming",
          error: null,
          progress: {
            activeTool: null,
            latestThought: null,
            toolHistory: [],
            matchedNames: [],
          },
          attachments: [],
        });
      } else {
        store.setQuery(normalizedQuery);
        if (isNewQuery) {
          store.setNarrative("");
          store.setTraceId(null);
          store.setResult(null);
        } else if (isRequery) {
          store.setResult(null);
        }
      }
      store.setSearching(true);
      store.setError(null);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Chat mode always wants a narrative; legacy mode skips it for re-queries.
      const needsNarrative = isChat || isNewQuery;

      const result = await streamPhilanthropyQuery(
        normalizedQuery,
        conversationMessages,
        page,
        controller.signal,
        needsNarrative,
        options?.sort,
        options?.entityTypes,
        {
          onHeader: (h) => {
            if (isChat) {
              usePhilanthropyStore.getState().updateLastTurn({
                entities: h.entities,
                citations: h.citations,
                traceId: h.traceId,
                pagination: h.pagination,
                attachments: h.attachments,
              });
              return;
            }
            if (isPagination) {
              const prev = usePhilanthropyStore.getState().result;
              usePhilanthropyStore.getState().setResult({
                entities: [...(prev?.entities ?? []), ...h.entities],
                citations: h.citations,
                intent: h.intent ?? prev?.intent,
                pagination: h.pagination,
              } as QueryResponse);
            } else {
              usePhilanthropyStore.getState().setResult({
                entities: h.entities,
                citations: h.citations,
                intent: h.intent,
                pagination: h.pagination,
              } as QueryResponse);
              if (isNewQuery) {
                usePhilanthropyStore.getState().setTraceId(h.traceId);
              }
            }
          },
          onNarrative: (text) => {
            if (isChat) {
              usePhilanthropyStore.getState().updateLastTurn({ narrative: text });
              return;
            }
            if (!isPagination) {
              usePhilanthropyStore.getState().setNarrative(text);
            }
          },
          onProgress: (event) => {
            // Only chat mode renders progress today.
            if (!isChat) return;
            const s = usePhilanthropyStore.getState();
            const last = s.messages[s.messages.length - 1];
            const current = last?.progress ?? {
              activeTool: null,
              latestThought: null,
              toolHistory: [],
              matchedNames: [],
            };
            switch (event.kind) {
              case "interpreted_query":
                // No state change; the spinner already shows "Searching..."
                break;
              case "assistant_text":
                s.updateLastTurn({
                  progress: { ...current, latestThought: event.text ?? null },
                });
                break;
              case "tool_started":
                s.updateLastTurn({
                  progress: {
                    ...current,
                    activeTool: event.tool ?? null,
                    toolHistory: [
                      ...current.toolHistory,
                      { tool: event.tool ?? "tool", status: "running", durationMs: null },
                    ],
                  },
                });
                break;
              case "tool_completed":
              case "tool_failed": {
                // Mark the most-recent matching running entry as done.
                const toolHistory = [...current.toolHistory];
                for (let i = toolHistory.length - 1; i >= 0; i -= 1) {
                  if (toolHistory[i].tool === event.tool && toolHistory[i].status === "running") {
                    toolHistory[i] = {
                      tool: toolHistory[i].tool,
                      status: event.kind === "tool_completed" ? "completed" : "failed",
                      durationMs: event.durationMs ?? null,
                    };
                    break;
                  }
                }
                s.updateLastTurn({
                  progress: { ...current, activeTool: null, toolHistory },
                });
                break;
              }
              case "matched_entities":
                s.updateLastTurn({
                  progress: { ...current, matchedNames: event.names ?? [] },
                });
                break;
              case "assumptions":
              case "evidence_progress":
                // Not surfaced in the UI today. Reserved for later.
                break;
            }
          },
        }
      );

      result.match(
        ({ header }) => {
          void header;
          if (isChat) {
            // Clear progress now that final_answer has landed.
            usePhilanthropyStore.getState().updateLastTurn({
              status: "done",
              progress: null,
            });
          }

          if (!isPagination) {
            addHistory.mutate(normalizedQuery, {
              onSuccess: (entry) => {
                useSearchSessionStore.getState().setSession(entry.id, normalizedQuery);
                options?.onSearchId?.(entry.id);
              },
              onError: () => {
                const sessionId = useSearchSessionStore.getState().createSession(normalizedQuery);
                options?.onSearchId?.(sessionId);
              },
            });
          }
        },
        (appErr) => {
          if (appErr.type === "AbortError") return; // silently swallow
          const msg =
            appErr.type === "NetworkError" ||
            appErr.type === "StreamError" ||
            appErr.type === "ApiError"
              ? appErr.message
              : "Failed to connect";
          if (isChat) {
            usePhilanthropyStore.getState().updateLastTurn({ status: "error", error: msg });
          } else {
            usePhilanthropyStore.getState().setError(msg);
          }
        }
      );

      usePhilanthropyStore.getState().setSearching(false);
    },
    [addHistory]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { search, abort };
}
