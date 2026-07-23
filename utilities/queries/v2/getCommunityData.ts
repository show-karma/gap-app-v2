import { cache } from "react";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Category } from "@/types/impactMeasurement";
import type { Community, CommunityProjects, CommunityStats } from "@/types/v2/community";
import { zeroUID } from "@/utilities/commons";
import { INDEXER } from "@/utilities/indexer";
import { api } from "../../api/client";

// Deliberately NOT `orElse`: this loader is awaited unguarded (no `.catch`)
// from ~30 server components/layouts under app/community/[communityId]/**.
// The legacy `fetchData` adapter never threw, so every failure mode —
// network blips AND non-2xx statuses — degraded to `null` here. Swallowing
// only "expected" ApiErrors (via orElse) would let a plain HTTP 404/500 from
// the indexer propagate as an unhandled rejection across those call sites,
// which is a behavior change out of scope for this migration.
// No schema — `details.name` and `uid` being absent/malformed is an expected,
// business-meaningful degrade case handled below (not a contract violation),
// so this stays untyped rather than risk a stricter-than-reality schema.
// TODO(#1775): add zod schema once the "not found" response shape is confirmed.
export const getCommunityDetails = cache(async (slug: string): Promise<Community | null> => {
  try {
    const data = await api.get<Community | null>(INDEXER.COMMUNITY.V2.GET(slug));

    if (!data || data?.uid === zeroUID || !data?.details?.name) {
      return null;
    }

    return data;
  } catch (_error) {
    return null;
  }
});

const CommunityStatsSchema = z
  .object({
    totalProjects: z.number(),
    totalGrants: z.number(),
    totalMilestones: z.number(),
    projectUpdates: z.number(),
    projectUpdatesBreakdown: z
      .object({
        projectMilestones: z.number(),
        projectCompletedMilestones: z.number(),
        projectUpdates: z.number(),
        grantMilestones: z.number(),
        grantCompletedMilestones: z.number(),
        grantUpdates: z.number(),
      })
      .passthrough(),
    totalTransactions: z.number(),
    averageCompletion: z.number(),
  })
  .passthrough();

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
  let data: CommunityStats | undefined;
  try {
    data = await api.get<CommunityStats>(INDEXER.COMMUNITY.V2.STATS(slug), {
      schema: CommunityStatsSchema,
    });
  } catch (error) {
    throw new Error(
      `Failed to fetch community stats for "${slug}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!data) {
    throw new Error(`Community stats for "${slug}" returned an empty response`);
  }

  return data;
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
    // TODO(#1775): add zod schema — CommunityProjects nests a large
    // CommunityProject shape (members/links/endorsements/etc.) not safe to
    // re-derive strictly here.
    const data = await api.get<CommunityProjects | null>(
      INDEXER.COMMUNITY.V2.PROJECTS(slug, normalizedOptions)
    );

    if (data) {
      return data;
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
  let data: Category[];
  try {
    // TODO(#1775): add zod schema — Category nests optional impact_segments/
    // outputs arrays (see types/impactMeasurement.ts) not safe to re-derive
    // strictly here.
    data = await api.get<Category[]>(INDEXER.COMMUNITY.CATEGORIES(communityId));
  } catch (error) {
    errorManager(`Error fetching categories for community ${communityId}`, error);
    throw error;
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
