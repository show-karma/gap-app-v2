/**
 * Search history service — ported from
 * grant-atlas features/grant-atlas/services/search-history.service.ts.
 *
 * Uses apiFetch (authenticated via TokenManager) to create and retrieve
 * search history entries. Returns ResultAsync<_, AppError> for neverthrow
 * pipeline compatibility.
 */
import type { ResultAsync } from "neverthrow";
import { z } from "zod";
import { NON_PROFITS_API } from "../lib/api";
import { apiFetch } from "../lib/api-fetch";
import type { AppError } from "../lib/errors";

export const SearchHistoryEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  query: z.string(),
  createdAt: z.string(),
});
export type SearchHistoryEntry = z.infer<typeof SearchHistoryEntrySchema>;

export const searchHistoryService = {
  list(limit = 20): ResultAsync<SearchHistoryEntry[], AppError> {
    return apiFetch(
      `${NON_PROFITS_API.SEARCH_HISTORY.LIST}?limit=${limit}`,
      z.array(SearchHistoryEntrySchema),
      "GET"
    );
  },

  create(query: string): ResultAsync<SearchHistoryEntry, AppError> {
    return apiFetch(NON_PROFITS_API.SEARCH_HISTORY.CREATE, SearchHistoryEntrySchema, "POST", {
      query,
    });
  },

  getById(id: string): ResultAsync<SearchHistoryEntry, AppError> {
    return apiFetch(NON_PROFITS_API.SEARCH_HISTORY.GET(id), SearchHistoryEntrySchema, "GET");
  },

  deleteOne(id: string): ResultAsync<void, AppError> {
    return apiFetch(NON_PROFITS_API.SEARCH_HISTORY.DELETE(id), z.void(), "DELETE");
  },

  clearAll(): ResultAsync<void, AppError> {
    return apiFetch(NON_PROFITS_API.SEARCH_HISTORY.CLEAR, z.void(), "DELETE");
  },
};
