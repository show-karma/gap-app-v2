import { useInfiniteQuery } from "@tanstack/react-query";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

const CommunityWithStatsSchema = z
  .object({
    uid: z.string(),
    chainID: z.number(),
    details: z
      .object({
        name: z.string(),
        description: z.string(),
        logoUrl: z.string(),
        slug: z.string(),
      })
      .passthrough(),
    stats: z
      .object({
        totalProjects: z.number(),
        totalGrants: z.number(),
        totalMembers: z.number(),
      })
      .passthrough(),
    categories: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
type CommunityWithStats = z.infer<typeof CommunityWithStatsSchema>;

const CommunitiesResponseSchema = z
  .object({
    payload: z.array(CommunityWithStatsSchema),
    pagination: z
      .object({
        totalCount: z.number(),
        totalPages: z.number(),
        page: z.number(),
        hasNextPage: z.boolean(),
        hasPrevPage: z.boolean(),
      })
      .passthrough(),
  })
  .passthrough();
type CommunitiesResponse = z.infer<typeof CommunitiesResponseSchema>;

interface UseCommunitiesOptions {
  limit?: number;
  includeStats?: boolean;
}

export const useCommunities = (options: UseCommunitiesOptions = {}) => {
  const { limit = 12, includeStats = true } = options;

  return useInfiniteQuery<CommunitiesResponse, Error>({
    queryKey: ["communities", { limit, includeStats }],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const endpoint = INDEXER.COMMUNITY.LIST({
          page: pageParam as number,
          limit,
          includeStats,
        });
        return await api.get<CommunitiesResponse>(endpoint, {
          isAuthorized: false,
          schema: CommunitiesResponseSchema,
        });
      } catch (error: any) {
        errorManager("Error fetching communities", error);
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export type { CommunityWithStats, CommunitiesResponse };
