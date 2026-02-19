import { useQuery } from "@tanstack/react-query";
import { programService } from "@/services/programs";

// Query keys
export const PROGRAM_QUERY_KEYS = {
  all: ["programs"] as const,
  community: (communityId: string) =>
    [...PROGRAM_QUERY_KEYS.all, "community", communityId] as const,
};

interface UseCommunityProgramsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch programs for a community
 */
export const useCommunityPrograms = (
  communityId: string,
  options: UseCommunityProgramsOptions = {}
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: PROGRAM_QUERY_KEYS.community(communityId),
    queryFn: () => programService.getCommunityPrograms(communityId),
    enabled: !!communityId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
