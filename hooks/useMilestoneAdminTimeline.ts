import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import { getMilestoneTimeline } from "@/services/milestoneActionItemsService";
import type { IMilestoneTimeline } from "@/types/funding-platform";

interface UseMilestoneAdminTimelineOptions {
  /** Gate the query — the endpoint is community-admin only and 403s otherwise. */
  enabled?: boolean;
}

/**
 * Fetches a milestone's lifecycle timeline for the admin queue detail pane.
 *
 * The indexer assembles the events (on-chain status history merged with
 * invoice and payment records) and computes the per-stage durations, so this
 * hook performs no derivation — same no-frontend-logic contract as
 * `useReviewerInbox`.
 */
export function useMilestoneAdminTimeline(
  communityId: string,
  milestoneUid: string | undefined,
  options: UseMilestoneAdminTimelineOptions = {}
) {
  const { enabled = true } = options;

  const query = useQuery<IMilestoneTimeline>({
    queryKey: QUERY_KEYS.milestoneTimeline(communityId, milestoneUid ?? ""),
    queryFn: () => getMilestoneTimeline(communityId, milestoneUid as string),
    enabled: Boolean(communityId) && Boolean(milestoneUid) && enabled,
    staleTime: 1000 * 60 * 2,
  });

  return {
    timeline: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
