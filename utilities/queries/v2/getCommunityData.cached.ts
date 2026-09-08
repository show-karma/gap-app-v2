import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { Category } from "@/types/impactMeasurement";
import type { Community, CommunityProjects } from "@/types/v2/community";
import { communityProjectsTag, communityTag } from "@/utilities/cache/tags";
import {
  getCommunityCategories,
  getCommunityDetails,
  getCommunityProjects,
} from "./getCommunityData";

/**
 * Cached, server-only twins of the community loaders.
 *
 * The directive cannot go on the loaders themselves: `getCommunityDetails` and
 * `getCommunityProjects` are imported by client components and hooks
 * (`useCommunityProjectsInfinite`, the donate page, `useAggregatedIndicators`),
 * and a `"use cache"` function is server-only. Splitting the cached path off
 * keeps the client behaviour byte-identical — token attached, uncached — and
 * caches only what the server renders into the shared, crawlable document.
 *
 * That split is the same one `publicReadOptions()` already makes: it returns
 * `isAuthorized: typeof window !== "undefined"`, so these calls carry no
 * Authorization header on the server. That is what makes caching them safe —
 * a cached response provably belongs to no one.
 *
 * `cacheLife("minutes")` is `{ stale: 300, revalidate: 60, expire: 3600 }`. The
 * 60s revalidate is the same ceiling the routes had before, and it is what
 * keeps the pages self-healing while nothing calls `revalidateTag` yet.
 */

export async function getCommunityDetailsCached(slug: string): Promise<Community | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(communityTag(slug));

  return getCommunityDetails(slug);
}

export async function getCommunityCategoriesCached(communityId: string): Promise<Category[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(communityTag(communityId));

  return getCommunityCategories(communityId);
}

/**
 * The project grid. Tagged with its own key as well as the community's: a new
 * project changes this list without changing the community, and the two want
 * to be invalidated independently.
 *
 * Every argument is part of the cache key, so the filtered/paginated variants
 * the client drives get their own entries rather than colliding with the
 * default grid the server renders.
 */
export async function getCommunityProjectsCached(
  slug: string,
  options: Parameters<typeof getCommunityProjects>[1] = {}
): Promise<CommunityProjects> {
  "use cache";
  cacheLife("minutes");
  cacheTag(communityTag(slug), communityProjectsTag(slug));

  return getCommunityProjects(slug, options);
}
