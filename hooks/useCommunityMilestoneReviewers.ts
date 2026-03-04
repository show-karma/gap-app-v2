import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { milestoneReviewersService } from "@/services/milestone-reviewers.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export interface CommunityReviewer {
  publicAddress: string;
  name: string;
  email: string;
}

interface ReviewerInput {
  publicAddress?: string;
  name: string;
  email: string;
}

export function deduplicateAndSortReviewers(
  queryResults: Array<ReviewerInput[] | undefined>
): CommunityReviewer[] {
  const seen = new Map<string, CommunityReviewer>();

  for (const data of queryResults) {
    if (!data) continue;
    for (const reviewer of data) {
      if (!reviewer.publicAddress) continue;
      const address = reviewer.publicAddress.toLowerCase();
      if (!seen.has(address)) {
        seen.set(address, {
          publicAddress: reviewer.publicAddress,
          name: reviewer.name,
          email: reviewer.email,
        });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    (a.name || a.publicAddress).localeCompare(b.name || b.publicAddress)
  );
}

export function useCommunityMilestoneReviewers(programIds: string[]) {
  const queries = useQueries({
    queries: programIds.map((programId) => ({
      queryKey: QUERY_KEYS.REVIEWERS.MILESTONE(programId),
      queryFn: () => milestoneReviewersService.getReviewers(programId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const firstError = queries.find((q) => q.error)?.error as Error | undefined;
  const isError = Boolean(firstError);

  const dataKey = queries.map((q) => q.dataUpdatedAt).join(",");

  const reviewers = useMemo(() => {
    if (isError) return [];
    return deduplicateAndSortReviewers(queries.map((q) => q.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, isError]);

  return { reviewers, isLoading, isError, error: firstError ?? null };
}
