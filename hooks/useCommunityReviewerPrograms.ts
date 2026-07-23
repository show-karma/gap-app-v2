import { useQuery } from "@tanstack/react-query";
import { fetchCommunityReviewerPrograms } from "@/services/community-reviewers/community-reviewers.api";
import type { CommunityReviewerProgramsResponse } from "@/services/community-reviewers/community-reviewers.types";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseCommunityReviewerProgramsParams {
  communityUID: string;
  enabled?: boolean;
}

export function useCommunityReviewerPrograms({
  communityUID,
  enabled = true,
}: UseCommunityReviewerProgramsParams) {
  return useQuery<CommunityReviewerProgramsResponse, Error>({
    queryKey: QUERY_KEYS.REVIEWERS.COMMUNITY_PROGRAMS(communityUID),
    queryFn: () => fetchCommunityReviewerPrograms(communityUID),
    enabled: !!communityUID && enabled,
    staleTime: 60 * 1000,
  });
}
