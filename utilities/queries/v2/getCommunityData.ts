import { cache } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Category } from "@/types/impactMeasurement";
import type { Community, CommunityProjects, CommunityStats } from "@/types/v2/community";
import { zeroUID } from "@/utilities/commons";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getCommunityDetails = cache(async (slug: string): Promise<Community | null> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.V2.GET(slug));

    if (!data || data?.uid === zeroUID || !data?.details?.name) {
      return null;
    }

    return data as Community;
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
): Promise<CommunityProjects> => {
  try {
    // Normalize programId (remove chainId suffix if present) before sending to API
    const normalizedOptions = {
      ...options,
      selectedProgramId: options.selectedProgramId
        ? options.selectedProgramId.includes("_")
          ? options.selectedProgramId.split("_")[0]
          : options.selectedProgramId
        : undefined,
    };
    const [data] = await fetchData(INDEXER.COMMUNITY.V2.PROJECTS(slug, normalizedOptions));

    if (data) {
      return data as CommunityProjects;
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
 * Fetches community categories with impact segments merged from outputs,
 * throwing when the underlying request fails.
 *
 * @remarks
 * Throws (via `errorManager`) when the indexer returns an error so callers
 * using React Query get a truthful `isError` state. A community with no
 * configured categories legitimately resolves to an empty array — this is
 * NOT an error and must stay distinguishable from a request failure.
 *
 * Use this variant for client-side queries (`useCommunityCategories`).
 * Server pages that must degrade gracefully should use the non-throwing
 * {@link getCommunityCategories} wrapper instead.
 *
 * Automatically merges outputs into impact_segments to avoid duplication.
 */
export const getCommunityCategoriesOrThrow = async (communityId: string): Promise<Category[]> => {
  const [data, error] = await fetchData(INDEXER.COMMUNITY.CATEGORIES(communityId));

  if (error) {
    errorManager(`Error fetching categories for community ${communityId}`, error);
    throw new Error(error);
  }

  if (!data?.length) {
    return [];
  }

  // Merge outputs into impact_segments to avoid duplication
  const categoriesWithMergedSegments = data.map((category: Category) => {
    const outputsNotDuplicated = category.outputs?.filter(
      (output) =>
        !category.impact_segments?.some(
          (segment) => segment.id === output.id || segment.name === output.name
        )
    );

    return {
      ...category,
      impact_segments: [
        ...(category.impact_segments || []),
        ...(outputsNotDuplicated || []).map((output) => ({
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
};

/**
 * Fetches community categories with impact segments merged from outputs.
 *
 * @remarks
 * Returns empty array on error instead of throwing — preserves the contract
 * the SSR community pages rely on so a category fetch failure degrades to
 * rendering without category filters rather than hitting the error boundary.
 * Uses React cache() for request deduplication.
 *
 * Client components should prefer {@link getCommunityCategoriesOrThrow} (via
 * `useCommunityCategories`) so they can surface a real error state.
 */
export const getCommunityCategories = cache(async (communityId: string): Promise<Category[]> => {
  try {
    return await getCommunityCategoriesOrThrow(communityId);
  } catch (_error) {
    return [];
  }
});

// Aliases for backward compatibility during migration
export const getCommunityDetailsV2 = getCommunityDetails;
export const getCommunityStatsV2 = getCommunityStats;
export const getCommunityProjectsV2 = getCommunityProjects;
