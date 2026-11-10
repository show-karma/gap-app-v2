"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import type { ActionItemTarget } from "@/hooks/useActionItems";
import {
  getFollowUpChannels,
  getFollowUpWorkspaces,
  searchFollowUpMembers,
  setFollowUpTargets,
  suggestFollowUpTargets,
} from "@/services/milestoneActionItemsService";
import type { FollowUpTarget, FollowUpTargetInput } from "@/types/follow-up-target";
import type { IMilestoneActionItem } from "@/types/funding-platform";

const STALE_MS = 60_000;

export const followUpTargetKeys = {
  workspaces: (communityId: string, itemId: string) =>
    ["follow-up-workspaces", communityId, itemId] as const,
  channels: (communityId: string, itemId: string, teamId: string) =>
    ["follow-up-channels", communityId, itemId, teamId] as const,
  members: (communityId: string, itemId: string, teamId: string, q: string) =>
    ["follow-up-members", communityId, itemId, teamId, q] as const,
};

/**
 * Suggests or replaces where one action item's auto follow-up goes, writing the
 * result straight into the cached note list so the row updates without a
 * refetch; the community-wide list is invalidated because it renders the same
 * rows elsewhere.
 */
export function useFollowUpTargets(communityId: string, target: ActionItemTarget) {
  const queryClient = useQueryClient();
  const listKey =
    target.kind === "application"
      ? QUERY_KEYS.applicationActionItems(communityId, target.id)
      : QUERY_KEYS.milestoneActionItems(communityId, target.id);

  // A list refetch started before the server persisted the targets would
  // overwrite them with the empty array it read, so the in-flight fetch is
  // cancelled before the write and a fresh one scheduled after it.
  const apply = useCallback(
    async (itemId: string, targets: FollowUpTarget[]) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      queryClient.setQueryData<IMilestoneActionItem[]>(listKey, (current) =>
        (current ?? []).map((item) =>
          item.id === itemId ? { ...item, followUpTargets: targets } : item
        )
      );
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ["community-action-items", communityId] });
    },
    [queryClient, listKey, communityId]
  );

  const suggest = useMutation({
    mutationFn: (itemId: string) => suggestFollowUpTargets(communityId, itemId),
    onSuccess: (targets, itemId) => apply(itemId, targets),
  });

  const set = useMutation({
    mutationFn: ({ itemId, targets }: { itemId: string; targets: FollowUpTargetInput[] }) =>
      setFollowUpTargets(communityId, itemId, targets),
    onSuccess: (targets, { itemId }) => apply(itemId, targets),
  });

  return { suggest, set };
}

export function useFollowUpWorkspaces(communityId: string, itemId: string, enabled: boolean) {
  return useQuery({
    queryKey: followUpTargetKeys.workspaces(communityId, itemId),
    queryFn: () => getFollowUpWorkspaces(communityId, itemId),
    enabled,
    staleTime: STALE_MS,
  });
}

export function useFollowUpChannels(
  communityId: string,
  itemId: string,
  teamId: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: followUpTargetKeys.channels(communityId, itemId, teamId ?? ""),
    queryFn: () => getFollowUpChannels(communityId, itemId, teamId ?? ""),
    enabled: enabled && Boolean(teamId),
    staleTime: STALE_MS,
    retry: false,
  });
}

export function useFollowUpMembers(
  communityId: string,
  itemId: string,
  teamId: string | undefined,
  q: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: followUpTargetKeys.members(communityId, itemId, teamId ?? "", q),
    queryFn: () => searchFollowUpMembers(communityId, itemId, teamId ?? "", q),
    enabled: enabled && Boolean(teamId),
    staleTime: STALE_MS,
    placeholderData: (previous) => previous,
  });
}
