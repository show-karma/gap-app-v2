/**
 * TanStack Query wrappers for search history — ported from
 * grant-atlas features/grant-atlas/hooks/use-search-history.ts.
 *
 * useSearchHistory: fetch by id (used to hydrate session on page load)
 * useAddSearchHistory: create a new entry after a successful search
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resultToPromise } from "../lib/result-to-promise";
import { type SearchHistoryEntry, searchHistoryService } from "../services/search-history.service";

const SEARCH_HISTORY_KEY = ["non-profits-search-history"] as const;

export function useSearchHistory(id: string) {
  return useQuery({
    queryKey: [...SEARCH_HISTORY_KEY, id],
    queryFn: () => resultToPromise(searchHistoryService.getById(id)),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useAddSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (query: string) => resultToPromise(searchHistoryService.create(query)),
    onSuccess: (newEntry) => {
      queryClient.setQueriesData<SearchHistoryEntry[]>({ queryKey: SEARCH_HISTORY_KEY }, (old) => {
        if (!old) return [newEntry];
        const filtered = old.filter((e) => e.query.toLowerCase() !== newEntry.query.toLowerCase());
        return [newEntry, ...filtered].slice(0, 50);
      });
    },
  });
}
