import { useQuery } from "@tanstack/react-query";
import type { CommunityProjects } from "@/types/v2/community";
import { getCommunityProjects } from "@/utilities/queries/v2/getCommunityData";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseCommunityProjectsOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  categories?: string;
  status?: string;
  selectedProgramId?: string;
  selectedTrackIds?: string[];
}

export const useCommunityProjects = (slug: string, options?: UseCommunityProjectsOptions) => {
  return useQuery<CommunityProjects, Error>({
    queryKey: QUERY_KEYS.COMMUNITY.PROJECTS(slug, options),
    queryFn: () => getCommunityProjects(slug, options || {}),
    enabled: !!slug,
    retry: false,
  });
};

// Alias for backward compatibility during migration
export const useCommunityProjectsV2 = useCommunityProjects;
