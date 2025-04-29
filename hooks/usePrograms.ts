import { useQuery } from "@tanstack/react-query";
import { programService } from "@/services/programs";

// Query keys
export const PROGRAM_QUERY_KEYS = {
  all: ["programs"] as const,
  community: (communityId: string) =>
    [...PROGRAM_QUERY_KEYS.all, "community", communityId] as const,
  program: (programId: string) =>
    [...PROGRAM_QUERY_KEYS.all, "details", programId] as const,
};

/**
 * Hook to fetch programs for a community
 */
export const useCommunityPrograms = (communityId: string) => {
  return useQuery({
    queryKey: PROGRAM_QUERY_KEYS.community(communityId),
    queryFn: () => programService.getCommunityPrograms(communityId),
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a specific program by ID
 */
export const useProgram = (programId: string) => {
  return useQuery({
    queryKey: PROGRAM_QUERY_KEYS.program(programId),
    queryFn: () => programService.getProgram(programId),
    enabled: !!programId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
