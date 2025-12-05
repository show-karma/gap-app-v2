import { useQuery } from "@tanstack/react-query";
import type { CommunityProjectsResponse } from "@/types/v2/community";
import { getCommunityProjects } from "@/utilities/queries/v2/getCommunityData";

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
  return useQuery<CommunityProjectsResponse, Error>({
    queryKey: ["community-projects-v2", slug, options],
    queryFn: () => getCommunityProjects(slug, options || {}),
    enabled: !!slug,
    retry: false,
  });
};

// Alias for backward compatibility during migration
export const useCommunityProjectsV2 = useCommunityProjects;
