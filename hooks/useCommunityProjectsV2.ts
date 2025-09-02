import { CommunityProjectsV2Response } from "@/types/community";
import { getCommunityProjectsV2 } from "@/utilities/queries/getCommunityDataV2";
import { useQuery } from "@tanstack/react-query";

interface UseCommunityProjectsV2Options {
  page?: number;
  limit?: number;
  sortBy?: string;
  categories?: string;
  status?: string;
  selectedProgramId?: string;
  selectedTrackIds?: string[];
}

export const useCommunityProjectsV2 = (
  slug: string,
  options?: UseCommunityProjectsV2Options
) => {
  return useQuery<CommunityProjectsV2Response, Error>({
    queryKey: ["community-projects-v2", slug, options],
    queryFn: () => getCommunityProjectsV2(slug, options || {}),
    enabled: !!slug,
    retry: false,
  });
};