import { useInfiniteQuery } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface CommunityWithStats {
  uid: string;
  chainID: number;
  details: {
    name: string;
    description: string;
    logoUrl: string;
    slug: string;
  };
  stats: {
    totalProjects: number;
    totalGrants: number;
    totalMembers: number;
  };
  categories?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

interface CommunitiesResponse {
  payload: CommunityWithStats[];
  pagination: {
    totalCount: number;
    totalPages: number;
    page: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

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
        const [response, error] = await fetchData(endpoint, "GET", {}, {}, {}, false);

        if (error) {
          throw new Error(error);
        }

        if (!response) {
          return {
            payload: [],
            pagination: {
              totalCount: 0,
              totalPages: 0,
              page: pageParam as number,
              hasNextPage: false,
              hasPrevPage: false,
            },
          };
        }

        return response as CommunitiesResponse;
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
