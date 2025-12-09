import { useQuery } from "@tanstack/react-query";
import type { CommunityProjectsV2Response } from "@/types/community";
import { getCommunityProjects } from "@/utilities/queries/v2/community";

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
  return useQuery<CommunityProjectsV2Response, Error>({
    queryKey: ["community-projects", slug, options],
    queryFn: () => getCommunityProjects(slug, options || {}),
    enabled: !!slug,
    retry: false,
  });
};

/**
 * @deprecated Use useCommunityProjects instead
 */
export const useCommunityProjectsV2 = useCommunityProjects;
