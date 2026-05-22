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
import type { Citation, QueryIntent, QueryPagination, RankedEntity } from "../types/philanthropy";

// ── Stable empty-state constants ────────────────────────────────────────────
// Use these as fallbacks in selectors, never inline `?? []` or `?? {}`.

export const EMPTY_MESSAGES: ReadonlyArray<ChatTurn> = [];
export const EMPTY_TOOL_HISTORY: ReadonlyArray<ToolHistoryEntry> = [];
export const EMPTY_ENTITIES: ReadonlyArray<RankedEntity> = [];
export const EMPTY_CITATIONS: ReadonlyArray<Citation> = [];
export const EMPTY_ATTACHMENTS: ReadonlyArray<AgentAttachment> = [];

// ── Domain types ────────────────────────────────────────────────────────────

export interface AgentAttachment {
  /** Filename for the download (e.g. "prospects.csv"). */
  name: string;
  /** Data URL or object URL for the file content. */
  url: string;
  /** MIME type (e.g. "text/csv"). */
  mimeType: string;
}

export interface ToolHistoryEntry {
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

  // ── Chat actions (Phase 3 — included now to avoid store refactor) ──
  appendTurn: (turn: ChatTurn) => void;
  updateLastTurn: (patch: Partial<ChatTurn>) => void;

  // ── Legacy actions ──
  setQuery: (query: string) => void;
  setNarrative: (narrative: string) => void;
  setTraceId: (traceId: string | null) => void;
  setResult: (result: SearchResult | null) => void;
  setSearching: (searching: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ── Initial state ────────────────────────────────────────────────────────────

const initialState = {
  messages: EMPTY_MESSAGES as ReadonlyArray<ChatTurn>,
  query: "",
  narrative: "",
  traceId: null as string | null,
  result: null as SearchResult | null,
  isSearching: false,
  error: null as string | null,
} satisfies Omit<
  PhilanthropyStore,
  | "appendTurn"
  | "updateLastTurn"
  | "setQuery"
  | "setNarrative"
  | "setTraceId"
  | "setResult"
  | "setSearching"
  | "setError"
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

  setQuery: (query) => set({ query }),
  setNarrative: (narrative) => set({ narrative }),
  setTraceId: (traceId) => set({ traceId }),
  setResult: (result) => set({ result }),
  setSearching: (searching) => set({ isSearching: searching }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
