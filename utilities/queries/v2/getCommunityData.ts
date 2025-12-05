import { cache } from "react";
import type {
  CommunityDetailsResponse,
  CommunityProjectsResponse,
  CommunityStats,
} from "@/types/v2/community";
import { zeroUID } from "@/utilities/commons";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getCommunityDetails = cache(
  async (slug: string): Promise<CommunityDetailsResponse | null> => {
    try {
      const [data] = await fetchData(INDEXER.COMMUNITY.V2.GET(slug));

      if (!data || data?.uid === zeroUID || !data?.details?.name) {
        return null;
      }

      return data as CommunityDetailsResponse;
    } catch (_error) {
      return null;
    }
  }
);

export const getCommunityStats = cache(async (slug: string): Promise<CommunityStats> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.V2.STATS(slug));

    if (data) {
      return data as CommunityStats;
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
): Promise<CommunityProjectsResponse> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.V2.PROJECTS(slug, options));

    if (data) {
      return data as CommunityProjectsResponse;
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

// Aliases for backward compatibility during migration
export const getCommunityDetailsV2 = getCommunityDetails;
export const getCommunityStatsV2 = getCommunityStats;
export const getCommunityProjectsV2 = getCommunityProjects;
