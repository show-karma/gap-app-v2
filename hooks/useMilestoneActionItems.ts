import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  type CreateMilestoneActionItemInput,
  createMilestoneActionItem,
  deleteMilestoneActionItem,
  getMilestoneActionItems,
  type UpdateMilestoneActionItemInput,
  updateMilestoneActionItem,
} from "@/services/milestoneActionItemsService";
import type { IMilestoneActionItem } from "@/types/funding-platform";

interface UseMilestoneActionItemsOptions {
  /** Gate the query — the endpoints are community-admin only. */
  enabled?: boolean;
}

/** Placeholder id for an item that exists only in the optimistic cache. */
const OPTIMISTIC_ID_PREFIX = "optimistic-";

/**
 * Reads and mutates the admin follow-up log on a milestone.
 *
 * Every mutation applies an optimistic update and rolls back the exact previous
 * cache snapshot on error, then invalidates so the server's version — including
 * the server-stamped `completedAt` — becomes the source of truth. The inbox
 * feed is invalidated too, because a milestone's open-item count and
 * follow-up-overdue flag are rendered on its queue row.
 */
export function useMilestoneActionItems(
  communityId: string,
  milestoneUid: string | undefined,
  options: UseMilestoneActionItemsOptions = {}
) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => QUERY_KEYS.milestoneActionItems(communityId, milestoneUid ?? ""),
    [communityId, milestoneUid]
  );

  const query = useQuery<IMilestoneActionItem[]>({
    queryKey,
    queryFn: () => getMilestoneActionItems(communityId, milestoneUid as string),
    enabled: Boolean(communityId) && Boolean(milestoneUid) && enabled,
    staleTime: 1000 * 60,
  });

  /**
   * Snapshots the current list and hands back a rollback closure. Shared by
   * every mutation so the rollback always restores the exact pre-mutation
   * value rather than a re-derived one.
   */
  const snapshot = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<IMilestoneActionItem[]>(queryKey);
    return () => {
      if (previous !== undefined) {
        queryClient.setQueryData(queryKey, previous);
      }
    };
  }, [queryClient, queryKey]);

  const settle = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    // The queue row shows openActionItems / followUpOverdue for this milestone.
    queryClient.invalidateQueries({ queryKey: ["reviewer-inbox", communityId] });
  }, [queryClient, queryKey, communityId]);

  const createMutation = useMutation({
    mutationFn: (input: CreateMilestoneActionItemInput) =>
      createMilestoneActionItem(communityId, milestoneUid as string, input),
    onMutate: async (input) => {
      const rollback = await snapshot();
      const now = new Date().toISOString();

      const optimistic: IMilestoneActionItem = {
        id: `${OPTIMISTIC_ID_PREFIX}${now}`,
        milestoneUID: milestoneUid ?? "",
        grantUID: "",
        communityUID: "",
        programId: null,
        content: input.content,
        followUpAt: input.followUpAt ?? null,
        completedAt: null,
        completedByAddress: null,
        createdByAddress: "",
        createdByName: null,
        createdAt: now,
        updatedAt: now,
      };

      queryClient.setQueryData<IMilestoneActionItem[]>(queryKey, (current) => [
        optimistic,
        ...(current ?? []),
      ]);

      return { rollback };
    },
    onError: (_error, _input, context) => context?.rollback(),
    onSettled: settle,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMilestoneActionItemInput }) =>
      updateMilestoneActionItem(communityId, id, input),
    onMutate: async ({ id, input }) => {
      const rollback = await snapshot();
      const now = new Date().toISOString();

      queryClient.setQueryData<IMilestoneActionItem[]>(queryKey, (current) =>
        (current ?? []).map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            ...(input.content !== undefined && { content: input.content }),
            ...(input.followUpAt !== undefined && {
              followUpAt: input.followUpAt,
            }),
            // Mirror the server's transition rule locally so the checkbox and
            // the "done <date>" label agree instantly. The authoritative
            // timestamp arrives on invalidation.
            ...(input.completed !== undefined && {
              completedAt: input.completed ? (item.completedAt ?? now) : null,
              completedByAddress: input.completed ? item.completedByAddress : null,
            }),
            updatedAt: now,
          };
        })
      );

      return { rollback };
    },
    onError: (_error, _vars, context) => context?.rollback(),
    onSettled: settle,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMilestoneActionItem(communityId, id),
    onMutate: async (id) => {
      const rollback = await snapshot();

      queryClient.setQueryData<IMilestoneActionItem[]>(queryKey, (current) =>
        (current ?? []).filter((item) => item.id !== id)
      );

      return { rollback };
    },
    onError: (_error, _id, context) => context?.rollback(),
    onSettled: settle,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    createItem: createMutation.mutate,
    updateItem: updateMutation.mutate,
    deleteItem: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
