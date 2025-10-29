import { useQuery } from "@tanstack/react-query";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";

export interface CommunityProjectUpdatesResponse {
  payload: CommunityMilestoneUpdate[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
  };
}

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

  return useQuery<CommunityProjectUpdatesResponse, Error>({
    queryKey: QUERY_KEYS.COMMUNITY.PROJECT_UPDATES(communityId, status, page),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status !== "all") {
        params.append("status", status);
      }

      const response = await fetch(
        `${
          envVars.NEXT_PUBLIC_GAP_INDEXER_URL
        }${INDEXER.COMMUNITY.PROJECT_UPDATES(communityId)}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch community updates: ${response.statusText}`
        );
      }

      return response.json();
    },
    enabled: !!communityId,
    retry: false,
  });
};
