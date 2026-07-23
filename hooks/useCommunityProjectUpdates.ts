import { useQuery } from "@tanstack/react-query";
import {
  type CommunityUpdatesSortBy,
  type CommunityUpdatesSortOrder,
  fetchCommunityProjectUpdates,
} from "@/services/community-project-updates.service";
import type { CommunityUpdatesResponse } from "@/types/community-updates";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseCommunityProjectUpdatesOptions {
  page?: number;
  limit?: number;
  status?: "all" | "pending" | "completed" | "past_due";
  programId?: string | null;
  projectId?: string | null;
  sortBy?: CommunityUpdatesSortBy;
  sortOrder?: CommunityUpdatesSortOrder;
}

export const useCommunityProjectUpdates = (
  communityId: string,
  options: UseCommunityProjectUpdatesOptions = {}
) => {
  const { page = 1, limit = 25, status = "all", programId, projectId, sortBy, sortOrder } = options;

  return useQuery<CommunityUpdatesResponse, Error>({
    queryKey: QUERY_KEYS.COMMUNITY.PROJECT_UPDATES(
      communityId,
      status,
      page,
      limit,
      programId,
      projectId,
      sortBy,
      sortOrder
    ),
    queryFn: () =>
      fetchCommunityProjectUpdates({
        communityId,
        page,
        limit,
        status,
        programId,
        projectId,
        sortBy,
        sortOrder,
      }),
    enabled: !!communityId,
    retry: false,
  });
};
