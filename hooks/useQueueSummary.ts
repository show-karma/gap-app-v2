import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import type { ActionItemTarget } from "@/hooks/useActionItems";
import { getQueueItemSummary } from "@/services/milestoneActionItemsService";
import type { IQueueItemSummary } from "@/types/funding-platform";

interface UseQueueSummaryOptions {
  /** Gate the query — the endpoint is community-admin only and 403s otherwise. */
  enabled?: boolean;
}

/**
 * The AI brief for a queue item. The indexer caches it by the facts it was
 * written from, so reading is cheap; `refresh` asks for a rewrite and swaps
 * the cached brief for the new one.
 */
export function useQueueSummary(
  communityId: string,
  target: ActionItemTarget | undefined,
  options: UseQueueSummaryOptions = {}
) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const kind = target?.kind ?? "milestone";
  const id = target?.id ?? "";

  const queryKey = useMemo(
    () => QUERY_KEYS.queueSummary(communityId, kind, id),
    [communityId, kind, id]
  );

  const query = useQuery<IQueueItemSummary>({
    queryKey,
    queryFn: () => getQueueItemSummary(communityId, { kind, id }),
    enabled: Boolean(communityId) && Boolean(id) && enabled,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const refresh = useMutation({
    mutationFn: () => getQueueItemSummary(communityId, { kind, id }, { refresh: true }),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    refresh: refresh.mutate,
    isRefreshing: refresh.isPending,
  };
}
