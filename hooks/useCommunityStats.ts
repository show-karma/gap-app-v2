import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const CommunityStatsResponseSchema = z
  .object({
    activeCommunities: z.number(),
    totalProjectUpdates: z.number(),
    totalProjects: z.number(),
    totalGrants: z.number(),
  })
  .passthrough();
type CommunityStatsResponse = z.infer<typeof CommunityStatsResponseSchema>;

interface SummaryStats {
  title: string;
  value: string | number;
  shouldRound?: boolean;
}

export const useCommunityStats = () => {
  return useQuery<SummaryStats[], Error>({
    queryKey: QUERY_KEYS.PLATFORM.GLOBAL_STATS,
    queryFn: async (): Promise<SummaryStats[]> => {
      try {
        const endpoint = INDEXER.COMMUNITY.GLOBAL_STATS();
        const data = await api.get<CommunityStatsResponse>(endpoint, {
          isAuthorized: false,
          schema: CommunityStatsResponseSchema,
        });

        // Transform the API response to match the expected format
        return [
          {
            title: "Active Communities",
            value: data.activeCommunities,
            shouldRound: false, // Don't round community count
          },
          {
            title: "Projects",
            value: data.totalProjects,
            shouldRound: true,
          },
          {
            title: "Grants Tracked",
            value: data.totalGrants,
            shouldRound: true,
          },
          {
            title: "Project Updates",
            value: data.totalProjectUpdates,
            shouldRound: true,
          },
        ];
      } catch (error) {
        errorManager("Error fetching community stats", error);
        throw error;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 2,
  });
};
