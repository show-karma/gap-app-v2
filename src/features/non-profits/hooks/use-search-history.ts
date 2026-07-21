/**
 * TanStack Query wrappers for search history — ported from
 * grant-atlas features/grant-atlas/hooks/use-search-history.ts.
 *
 * useSearchHistory(id): fetch by id (used to hydrate session on page load)
 * useSearchHistoryList(limit): list recent entries (used by the history panel)
 * useAddSearchHistory: create a new entry after a successful search
 * useDeleteSearchHistoryEntry: optimistic delete of a single entry
 * useClearSearchHistory: optimistic clear-all
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { resultToPromise } from "../lib/result-to-promise";
import {
  type SearchHistoryEntry,
  type SearchTurnPayload,
  searchHistoryService,
} from "../services/search-history.service";

const SEARCH_HISTORY_KEY = ["non-profits-search-history"] as const;

export function useSearchHistory(id: string) {
  return useQuery({
    queryKey: [...SEARCH_HISTORY_KEY, id],
    queryFn: () => resultToPromise(searchHistoryService.getById(id)),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useSearchHistoryList(limit = 20) {
  const { authenticated } = useAuth();

  return useQuery({
    queryKey: [...SEARCH_HISTORY_KEY, "list", limit],
    queryFn: () => resultToPromise(searchHistoryService.list(limit)),
    enabled: authenticated,
    staleTime: 60_000,
  });
}

export function useAddSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    // `id` is the conversation id (the /search/[id] URL UUID) so turns
    // appended later attach to the URL the user is already on.
    mutationFn: ({ query, id }: { query: string; id?: string }) =>
      resultToPromise(searchHistoryService.create(query, id)),
    onSuccess: (newEntry) => {
      queryClient.setQueriesData<SearchHistoryEntry[]>({ queryKey: SEARCH_HISTORY_KEY }, (old) => {
        // The key prefix also matches detail entries ([key, id]) which hold
        // objects, not lists — leave those untouched.
        if (!Array.isArray(old)) return old;
        const filtered = old.filter((e) => e.query.toLowerCase() !== newEntry.query.toLowerCase());
        return [newEntry, ...filtered].slice(0, 50);
      });
      queryClient.invalidateQueries({ queryKey: [...SEARCH_HISTORY_KEY, "list"] });
    },
  });
}

export function useAppendSearchTurn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchId, turn }: { searchId: string; turn: SearchTurnPayload }) =>
      resultToPromise(searchHistoryService.appendTurn(searchId, turn)),
    onSuccess: (_turn, { searchId }) => {
      // Refresh the cached detail so a later revisit hydrates the new turn.
      queryClient.invalidateQueries({ queryKey: [...SEARCH_HISTORY_KEY, searchId] });
    },
  });
}

export function useDeleteSearchHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resultToPromise(searchHistoryService.deleteOne(id)),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: SEARCH_HISTORY_KEY });
      const previous = queryClient.getQueryData<SearchHistoryEntry[]>(SEARCH_HISTORY_KEY);
      queryClient.setQueriesData<SearchHistoryEntry[]>({ queryKey: SEARCH_HISTORY_KEY }, (old) =>
        old?.filter((e) => e.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SEARCH_HISTORY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SEARCH_HISTORY_KEY });
    },
  });
}

export function useClearSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resultToPromise(searchHistoryService.clearAll()),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: SEARCH_HISTORY_KEY });
      const previous = queryClient.getQueryData<SearchHistoryEntry[]>(SEARCH_HISTORY_KEY);
      queryClient.setQueriesData<SearchHistoryEntry[]>({ queryKey: SEARCH_HISTORY_KEY }, () => []);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SEARCH_HISTORY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SEARCH_HISTORY_KEY });
    },
  });
}
