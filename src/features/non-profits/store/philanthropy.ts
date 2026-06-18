/**
 * Philanthropy store — ported from grant-atlas store/philanthropy-chat.ts.
 *
 * Zustand v5 selector-safety rules (Phase 0 lesson):
 * - Never use usePhilanthropyStore() without a selector (subscribes to whole
 *   state, re-renders on every set()).
 * - Never return objects or arrays inline in selectors — use EMPTY_* module-
 *   level constants to avoid new reference on every render.
 * - Atomic selectors only: select one primitive at a time.
 *
 * Streaming actions (appendTurn, updateLastTurn) are included now to avoid
 * a breaking store refactor in Phase 3. They are not called in Phase 2.
 */
import { create } from "zustand";
import type { AgentAttachment } from "../lib/agentic-philanthropy";
import type { Citation, QueryIntent, QueryPagination, RankedEntity } from "../types/philanthropy";

export type { AgentAttachment };

// ── Stable empty-state constants ────────────────────────────────────────────
// Use these as fallbacks in selectors, never inline `?? []` or `?? {}`.

export const EMPTY_MESSAGES: ReadonlyArray<ChatTurn> = [];
export const EMPTY_TOOL_HISTORY: ReadonlyArray<ToolHistoryEntry> = [];
export const EMPTY_ENTITIES: ReadonlyArray<RankedEntity> = [];
export const EMPTY_CITATIONS: ReadonlyArray<Citation> = [];
export const EMPTY_ATTACHMENTS: ReadonlyArray<AgentAttachment> = [];

// ── Domain types ────────────────────────────────────────────────────────────

// AgentAttachment is re-exported from the agentic-philanthropy lib above.

interface ToolHistoryEntry {
  tool: string;
  status: "running" | "completed" | "failed";
  durationMs: number | null;
}

/**
 * Live progress emitted during the agent loop, before final_answer arrives.
 * Surfaced from the indexer's SSE stream so the UI can show the agent's
 * reasoning/tool activity instead of a 15s blank spinner.
 */
export interface TurnProgress {
  /** Latest tool the agent is invoking (null when between tools). */
  activeTool: string | null;
  /** Most recent reasoning/narration block from the agent. */
  latestThought: string | null;
  /**
   * Tool calls observed in order, oldest first.
   * IMPORTANT: do not use `?? []` in selectors — use EMPTY_TOOL_HISTORY.
   */
  toolHistory: ReadonlyArray<ToolHistoryEntry>;
  /** Names of organizations the agent has matched so far. */
  matchedNames: ReadonlyArray<string>;
}

export interface ChatTurn {
  /** Stable id for React keys and updates. */
  id: string;
  /** The user query as typed (no synthesized context). */
  userQuery: string;
  /** Assistant narrative (markdown). Streams in during Phase 3. */
  narrative: string;
  /** Entities ranked for this turn. */
  entities: ReadonlyArray<RankedEntity>;
  /** Citations supporting the narrative. */
  citations: ReadonlyArray<Citation>;
  /** Trace id from the indexer for feedback. */
  traceId: string | null;
  /** Pagination metadata. */
  pagination: QueryPagination | null;
  /** Streaming/done/error state. */
  status: "streaming" | "done" | "error";
  /** Error message if status === 'error'. */
  error: string | null;
  /** Live progress while status === 'streaming'. Null once final_answer lands. */
  progress: TurnProgress | null;
  /** Files the agent prepared for download in this turn (CSV exports, etc.). */
  attachments: ReadonlyArray<AgentAttachment>;
}

interface SearchResult {
  entities: ReadonlyArray<RankedEntity>;
  citations: ReadonlyArray<Citation>;
  intent: QueryIntent;
  pagination: QueryPagination;
}

// ── Store interface ──────────────────────────────────────────────────────────

interface PhilanthropyStore {
  // ── Chat-style multi-turn state ──
  messages: ReadonlyArray<ChatTurn>;
  /**
   * The search-session id the current `messages` thread belongs to, or null
   * when no thread has been seeded. The store is global and survives
   * client-side navigation, so ChatView uses this to tell "returning to the
   * same session" (keep the thread) apart from "arriving on a new session
   * while a previous thread is still in memory" (reset, then seed).
   */
  threadId: string | null;

  // ── Legacy single-query state ──
  // Preserved during transition. New code should read `messages`.
  // Still updated by usePhilanthropyStream (Phase 3) so legacy consumers
  // keep working until they are removed.
  query: string;
  narrative: string;
  traceId: string | null;
  result: SearchResult | null;
  isSearching: boolean;
  error: string | null;
  /**
   * True when the backend rejected a persistence write for this conversation
   * because it belongs to another account (HTTP 403). The composer is disabled
   * and a read-only notice is shown so the user isn't typing into a void.
   */
  readOnly: boolean;
  /**
   * True when opening a conversation URL that the server won't return (HTTP
   * 404 — private to another account, deleted, or never persisted) and there
   * is no local query to re-run. The workbench shows a not-found state.
   */
  notFound: boolean;
  /**
   * True when the conversation has reached the server's per-conversation turn
   * cap (HTTP 409). The composer is disabled and the user is prompted to start
   * a new chat.
   */
  conversationFull: boolean;

  // ── Chat actions (Phase 3 — included now to avoid store refactor) ──
  appendTurn: (turn: ChatTurn) => void;
  updateLastTurn: (patch: Partial<ChatTurn>) => void;
  /** Replace the thread with turns restored from a saved conversation. */
  hydrateTurns: (turns: ReadonlyArray<ChatTurn>) => void;
  setThreadId: (id: string | null) => void;

  // ── Legacy actions ──
  setQuery: (query: string) => void;
  setNarrative: (narrative: string) => void;
  setTraceId: (traceId: string | null) => void;
  setResult: (result: SearchResult | null) => void;
  setSearching: (searching: boolean) => void;
  setError: (error: string | null) => void;
  setReadOnly: (readOnly: boolean) => void;
  setNotFound: (notFound: boolean) => void;
  setConversationFull: (conversationFull: boolean) => void;
  reset: () => void;
}

// ── Initial state ────────────────────────────────────────────────────────────

const initialState = {
  messages: EMPTY_MESSAGES as ReadonlyArray<ChatTurn>,
  threadId: null as string | null,
  query: "",
  narrative: "",
  traceId: null as string | null,
  result: null as SearchResult | null,
  isSearching: false,
  error: null as string | null,
  readOnly: false,
  notFound: false,
  conversationFull: false,
} satisfies Omit<
  PhilanthropyStore,
  | "appendTurn"
  | "updateLastTurn"
  | "hydrateTurns"
  | "setThreadId"
  | "setQuery"
  | "setNarrative"
  | "setTraceId"
  | "setResult"
  | "setSearching"
  | "setError"
  | "setReadOnly"
  | "setNotFound"
  | "setConversationFull"
  | "reset"
>;

// ── Store ────────────────────────────────────────────────────────────────────

export const usePhilanthropyStore = create<PhilanthropyStore>((set) => ({
  ...initialState,

  // Append a new turn to the end of the messages list.
  appendTurn: (turn) =>
    set((s) => ({
      messages: [...s.messages, turn],
    })),

  // Patch the last message in the list (used during streaming).
  updateLastTurn: (patch) =>
    set((s) => {
      if (s.messages.length === 0) return s;
      const last = s.messages[s.messages.length - 1];
      const updated = { ...last, ...patch };
      return { messages: [...s.messages.slice(0, -1), updated] };
    }),

  // Restore a saved conversation in one shot (revisit / shared link).
  hydrateTurns: (turns) => set({ messages: [...turns] }),

  setThreadId: (threadId) => set({ threadId }),
  setQuery: (query) => set({ query }),
  setNarrative: (narrative) => set({ narrative }),
  setTraceId: (traceId) => set({ traceId }),
  setResult: (result) => set({ result }),
  setSearching: (searching) => set({ isSearching: searching }),
  setError: (error) => set({ error }),
  setReadOnly: (readOnly) => set({ readOnly }),
  setNotFound: (notFound) => set({ notFound }),
  setConversationFull: (conversationFull) => set({ conversationFull }),
  reset: () => set({ ...initialState }),
}));
