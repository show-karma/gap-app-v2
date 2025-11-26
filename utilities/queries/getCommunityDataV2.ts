import { cache } from "react";
import type {
  CommunityDetailsV2,
  CommunityProjectsV2Response,
  CommunityStatsV2,
} from "@/types/community";
import { zeroUID } from "@/utilities/commons";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getCommunityDetailsV2 = cache(
  async (slug: string): Promise<CommunityDetailsV2 | null> => {
    try {
      const [data] = await fetchData(INDEXER.COMMUNITY.V2.GET(slug));

      if (!data || data?.uid === zeroUID || !data?.details?.name) {
        return null;
      }

      return data as CommunityDetailsV2;
    } catch (_error) {
      return null;
    }
  }
);

export const getCommunityStatsV2 = cache(async (slug: string): Promise<CommunityStatsV2> => {
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

export const getCommunityProjectsV2 = async (
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
