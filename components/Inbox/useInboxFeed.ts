import { useReviewerInbox } from "@/hooks/useReviewerInbox";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import type { InboxItem, InboxStats } from "./types";

export interface UseInboxFeedOptions {
  communityId: string;
  /** Whether to fetch the application review stream (Application Reviewer / admin). */
  includeApplications: boolean;
  /** Whether to fetch the milestone verification stream (Milestone Reviewer / admin). */
  includeMilestones: boolean;
  /** Server-side filters for the inbox (page/limit/status/search/sort/reviewerAddress). */
  applicationFilters?: IApplicationFilters;
}

export interface UseInboxFeedResult {
  items: InboxItem[];
  stats: InboxStats;
  isLoading: boolean;
  error: Error | null;
  /** Re-runs the inbox query — wired to the error card's "Try again" action. */
  refetch: () => void;
}

/**
 * Reads the Reviewer Inbox feed straight from the unified server endpoint via
 * `useReviewerInbox`. The indexer already merges the application and milestone
 * streams, buckets them, sorts them and computes the header stats — per the
 * no-frontend-logic rule, this hook owns no derivation. It only gates the query
 * and surfaces the server payload.
 */
export function useInboxFeed(options: UseInboxFeedOptions): UseInboxFeedResult {
  const { communityId, includeApplications, includeMilestones, applicationFilters = {} } = options;

  const { items, stats, isLoading, error, refetch } = useReviewerInbox(
    communityId,
    applicationFilters,
    {
      enabled: includeApplications || includeMilestones,
    }
  );

  return {
    items,
    stats,
    isLoading,
    error: (error as Error | null) ?? null,
    refetch,
  };
}
