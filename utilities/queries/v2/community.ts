import { cache } from "react";
import type {
  CommunityDetails,
  CommunityProjectsResponse,
  CommunityStats,
} from "@/types/community";
import { zeroUID } from "@/utilities/commons";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches community details with Next.js cache revalidation (30 minutes).
 * Returns null if community not found.
 */
export const getCommunityDetails = cache(async (slug: string): Promise<CommunityDetails | null> => {
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

    const data: CommunityDetails = await response.json();

    if (!data || data?.uid === zeroUID || !data?.details?.name) {
      return null;
    }

    return data;
  } catch (_error) {
    return null;
  }
});

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

/**
 * Fetches community categories with impact segments merged from outputs
 *
 * @remarks
 * Returns empty array on error instead of throwing.
 * Automatically merges outputs into impact_segments to avoid duplication.
 * Uses React cache() for request deduplication.
 */
export const getCommunityCategories = cache(async (communityId: string): Promise<Array<any>> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.CATEGORIES(communityId));

    if (!data?.length) {
      return [];
    }

    // Merge outputs into impact_segments to avoid duplication
    const categoriesWithMergedSegments = data.map((category: any) => {
      const outputsNotDuplicated = category.outputs?.filter(
        (output: any) =>
          !category.impact_segments?.some(
            (segment: any) => segment.id === output.id || segment.name === output.name
          )
      );

      return {
        ...category,
        impact_segments: [
          ...(category.impact_segments || []),
          ...(outputsNotDuplicated || []).map((output: any) => ({
            id: output.id,
            name: output.name,
            description: output.description,
            impact_indicators: [],
            type: output.type,
          })),
        ],
      };
    });

    return categoriesWithMergedSegments;
  } catch (_error) {
    return [];
  }
});
