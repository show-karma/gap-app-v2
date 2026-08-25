import { useQuery } from "@tanstack/react-query";
import { getCommunityPrograms } from "@/services/community-programs.service";
import type { CommunityProgram } from "@/types/v2/community-program";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseCommunityProgramsOptions {
  enabled?: boolean;
}

/**
 * Canonical hook for fetching a community's funding programs from the public
 * V2 endpoint. Returns typed {@link CommunityProgram}s; the underlying service
 * re-throws on failure so `isError` reflects real fetch outages.
 */
export const useCommunityPrograms = (
  communityId: string,
  options: UseCommunityProgramsOptions = {}
) => {
  const { enabled = true } = options;

  return useQuery<CommunityProgram[]>({
    queryKey: QUERY_KEYS.COMMUNITY.PROGRAMS(communityId),
    queryFn: () => getCommunityPrograms(communityId),
    enabled: !!communityId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
