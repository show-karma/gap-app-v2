import { cache } from "react";
import type {
  CommunityDetailsV2,
  CommunityProjectsV2Response,
  CommunityStatsV2,
} from "@/types/community";
import { zeroUID } from "@/utilities/commons";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches community details with Next.js cache revalidation (30 minutes).
 * Returns null if community not found.
 */
export const getCommunityDetails = cache(
  async (slug: string): Promise<CommunityDetailsV2 | null> => {
    try {
      const response = await fetch(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.COMMUNITY.V2.GET(slug)}`,
        {
          method: "GET",
          next: { revalidate: 1800 }, // 30 minutes
        }
      );

      if (!response.ok) {
        return null;
      }

      const data: CommunityDetailsV2 = await response.json();

      if (!data || data?.uid === zeroUID || !data?.details?.name) {
        return null;
      }

      return data;
    } catch (_error) {
      return null;
    }
  }
);

export const getCommunityStats = cache(async (slug: string): Promise<CommunityStatsV2> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.V2.STATS(slug));

    if (data) {
      return data as CommunityStatsV2;
    }

    return {
      totalProjects: 0,
      totalGrants: 0,
      totalMilestones: 0,
      projectUpdates: 0,
      projectUpdatesBreakdown: {
        projectMilestones: 0,
        projectCompletedMilestones: 0,
        projectUpdates: 0,
        grantMilestones: 0,
        grantCompletedMilestones: 0,
        grantUpdates: 0,
      },
      totalTransactions: 0,
      averageCompletion: 0,
    };
  } catch (_error) {
    return {
      totalProjects: 0,
      totalGrants: 0,
      totalMilestones: 0,
      projectUpdates: 0,
      projectUpdatesBreakdown: {
        projectMilestones: 0,
        projectCompletedMilestones: 0,
        projectUpdates: 0,
        grantMilestones: 0,
        grantCompletedMilestones: 0,
        grantUpdates: 0,
      },
      totalTransactions: 0,
      averageCompletion: 0,
    };
  }
});

export const getCommunityProjects = async (
  slug: string,
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    categories?: string;
    status?: string;
    selectedProgramId?: string;
    selectedTrackIds?: string[];
  } = {}
): Promise<CommunityProjectsV2Response> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.V2.PROJECTS(slug, options));

    if (data) {
      return data as CommunityProjectsV2Response;
    }

    return {
      payload: [],
      pagination: {
        totalCount: 0,
        page: options.page || 1,
        limit: options.limit || 12,
        totalPages: 0,
        nextPage: null,
        prevPage: null,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  } catch (_error) {
    return {
      payload: [],
      pagination: {
        totalCount: 0,
        page: options.page || 1,
        limit: options.limit || 12,
        totalPages: 0,
        nextPage: null,
        prevPage: null,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
};

export const getCommunityCategories = cache(async (communityId: string): Promise<string[]> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.CATEGORIES(communityId));

    if (data?.length) {
      const categoriesToOrder = data.map((category: { name: string }) => category.name);
      return categoriesToOrder.sort((a: string, b: string) => a.localeCompare(b, "en"));
    }

    return [];
  } catch (_error) {
    return [];
  }
});
