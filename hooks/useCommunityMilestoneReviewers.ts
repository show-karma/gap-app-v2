import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { milestoneReviewersService } from "@/services/milestone-reviewers.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export interface CommunityReviewer {
  publicAddress: string;
  name: string;
  email: string;
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

  const reviewers = useMemo(() => {
    const seen = new Map<string, CommunityReviewer>();

    for (const query of queries) {
      if (!query.data) continue;
      for (const reviewer of query.data) {
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
  }, [queries]);

  return { reviewers, isLoading };
}
