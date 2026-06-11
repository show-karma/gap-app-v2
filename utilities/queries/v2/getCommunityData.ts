import { cache } from "react";
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

/**
 * Fetches aggregate stats for a community.
 *
 * Throws on transport failure or an empty/missing payload instead of fabricating an
 * all-zero {@link CommunityStats}. The previous silent-zero contract made React Query
 * cache a "successful" zero payload, so the consuming UI rendered a falsy 0 as "—" and
 * the Retry path could never fire. Surfacing the failure lets the caller distinguish a
 * genuine zero (rendered honestly) from a fetch error (rendered as an error + retry).
 *
 * Server-side callers (e.g. the OG-image route) MUST guard this with `.catch(...)` since
 * it now rejects on failure.
 */
export const getCommunityStats = cache(async (slug: string): Promise<CommunityStats> => {
  const [data, error] = await fetchData(INDEXER.COMMUNITY.V2.STATS(slug));

  if (error) {
    throw new Error(`Failed to fetch community stats for "${slug}": ${error}`);
  }

  if (!data) {
    throw new Error(`Community stats for "${slug}" returned an empty response`);
  }

  return data as CommunityStats;
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
 * Fetches community categories with impact segments merged from outputs
 *
 * @remarks
 * Returns empty array on error instead of throwing.
 * Automatically merges outputs into impact_segments to avoid duplication.
 * Uses React cache() for request deduplication.
 */
export const getCommunityCategories = cache(async (communityId: string): Promise<Category[]> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.CATEGORIES(communityId));

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
  } catch (_error) {
    return [];
  }
});

// Aliases for backward compatibility during migration
export const getCommunityDetailsV2 = getCommunityDetails;
export const getCommunityStatsV2 = getCommunityStats;
export const getCommunityProjectsV2 = getCommunityProjects;
