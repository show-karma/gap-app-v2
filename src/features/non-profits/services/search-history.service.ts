/**
 * Search history service — ported from
 * grant-atlas features/grant-atlas/services/search-history.service.ts.
 *
 * Uses apiFetch (authenticated via TokenManager) to create and retrieve
 * search history entries. Returns ResultAsync<_, AppError> for neverthrow
 * pipeline compatibility.
 *
 * Entries are full saved conversations: the client supplies the conversation
 * id (the /find-funders/search/[id] URL UUID) at create time and appends a
 * turn snapshot (query + narrative + entities + citations) after each
 * completed exchange, so revisiting the URL replays the conversation without
 * re-running the search.
 */
import type { ResultAsync } from "neverthrow";
import { z } from "zod";
import { NON_PROFITS_API } from "../lib/api";
import { apiFetch } from "../lib/api-fetch";
import type { AppError } from "../lib/errors";
import { CitationSchema, RankedEntitySchema } from "../types/philanthropy";

export const SearchHistoryEntrySchema = z.object({
  id: z.string(),
  // Nullable: an ownerless (logged-out) chat has `userId: null`; it becomes a
  // wallet address once the chat is claimed on the first authenticated request.
  userId: z.string().nullable(),
  query: z.string(),
  createdAt: z.string(),
});
export type SearchHistoryEntry = z.infer<typeof SearchHistoryEntrySchema>;

export const SavedSearchTurnSchema = z.object({
  id: z.string(),
  searchHistoryId: z.string(),
  turnIndex: z.number(),
  userQuery: z.string(),
  narrative: z.string(),
  entities: z.array(RankedEntitySchema),
  citations: z.array(CitationSchema),
  traceId: z.string().nullable(),
  createdAt: z.string(),
});
export type SavedSearchTurn = z.infer<typeof SavedSearchTurnSchema>;

export const SearchHistoryDetailSchema = SearchHistoryEntrySchema.extend({
  turns: z.array(SavedSearchTurnSchema),
});
export type SearchHistoryDetail = z.infer<typeof SearchHistoryDetailSchema>;

/** Turn snapshot sent to the indexer after a chat exchange completes. */
export interface SearchTurnPayload {
  id: string;
  userQuery: string;
  narrative: string;
  entities: SavedSearchTurn["entities"];
  citations: SavedSearchTurn["citations"];
  traceId: string | null;
}

export const searchHistoryService = {
  list(limit = 20): ResultAsync<SearchHistoryEntry[], AppError> {
    return apiFetch(
      `${NON_PROFITS_API.SEARCH_HISTORY.LIST}?limit=${limit}`,
      z.array(SearchHistoryEntrySchema),
      "GET"
    );
  },

  create(query: string, id?: string): ResultAsync<SearchHistoryEntry, AppError> {
    return apiFetch(NON_PROFITS_API.SEARCH_HISTORY.CREATE, SearchHistoryEntrySchema, "POST", {
      query,
      ...(id ? { id } : {}),
    });
  },

  getById(id: string): ResultAsync<SearchHistoryDetail, AppError> {
    return apiFetch(NON_PROFITS_API.SEARCH_HISTORY.GET(id), SearchHistoryDetailSchema, "GET");
  },

  appendTurn(searchId: string, turn: SearchTurnPayload): ResultAsync<SavedSearchTurn, AppError> {
    return apiFetch(
      NON_PROFITS_API.SEARCH_HISTORY.APPEND_TURN(searchId),
      SavedSearchTurnSchema,
      "POST",
      turn
    );
  },

  deleteOne(id: string): ResultAsync<void, AppError> {
    return apiFetch(NON_PROFITS_API.SEARCH_HISTORY.DELETE(id), z.void(), "DELETE");
  },

  clearAll(): ResultAsync<void, AppError> {
    return apiFetch(NON_PROFITS_API.SEARCH_HISTORY.CLEAR, z.void(), "DELETE");
  },
};
