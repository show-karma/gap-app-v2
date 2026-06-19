/**
 * Mapping between persisted conversation turns (indexer `search_history_turn`
 * rows) and the in-memory `ChatTurn` shape the chat workbench renders.
 *
 * Saved turns are always completed exchanges, so hydrated turns come back
 * with `status: "done"` and no streaming progress. Attachments (CSV exports)
 * are intentionally not persisted — they can be large base64 blobs and the
 * agent can regenerate them on request — so hydrated turns have none.
 */
import type { SavedSearchTurn, SearchTurnPayload } from "../services/search-history.service";
import type { ChatTurn } from "../store/philanthropy";

// Server-side zod bounds on the append-turn endpoint. Snapshots are clamped
// client-side so an oversized turn degrades (truncated snapshot) instead of
// failing to persist at all.
const MAX_SAVED_QUERY_CHARS = 4000;
const MAX_SAVED_NARRATIVE_CHARS = 40000;
const MAX_SAVED_ENTITIES = 500;
const MAX_SAVED_CITATIONS = 2000;

export function savedTurnToChatTurn(turn: SavedSearchTurn): ChatTurn {
  return {
    id: turn.id,
    userQuery: turn.userQuery,
    narrative: turn.narrative,
    entities: turn.entities,
    citations: turn.citations,
    traceId: turn.traceId,
    pagination: null,
    status: "done",
    error: null,
    progress: null,
    attachments: [],
  };
}

export function savedTurnsToChatTurns(turns: ReadonlyArray<SavedSearchTurn>): ChatTurn[] {
  return turns.map(savedTurnToChatTurn);
}

/** Snapshot a completed in-memory turn for persistence, within server bounds. */
export function chatTurnToTurnPayload(turn: ChatTurn): SearchTurnPayload {
  return {
    id: turn.id,
    userQuery: turn.userQuery.slice(0, MAX_SAVED_QUERY_CHARS),
    narrative: turn.narrative.slice(0, MAX_SAVED_NARRATIVE_CHARS),
    entities: turn.entities.slice(0, MAX_SAVED_ENTITIES),
    citations: turn.citations.slice(0, MAX_SAVED_CITATIONS),
    traceId: turn.traceId,
  };
}
