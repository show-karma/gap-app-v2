import { useQuery } from "@tanstack/react-query";
import { fetchCommunityProjectUpdates } from "@/services/community-project-updates.service";
import type { CommunityUpdatesResponse } from "@/types/community-updates";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export interface UseCommunityProjectUpdatesOptions {
  page?: number;
  limit?: number;
  status?: "all" | "pending" | "completed";
}

export const useCommunityProjectUpdates = (
  communityId: string,
  options: UseCommunityProjectUpdatesOptions = {}
) => {
  const { page = 1, limit = 25, status = "all" } = options;

  return useQuery<CommunityUpdatesResponse, Error>({
    queryKey: QUERY_KEYS.COMMUNITY.PROJECT_UPDATES(communityId, status, page),
    queryFn: () =>
      fetchCommunityProjectUpdates({
        communityId,
        page,
        limit,
        status,
      }),
    enabled: !!communityId,
    retry: false,
  });
};
