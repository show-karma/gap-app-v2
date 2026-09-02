import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getProject } from "@/services/project.service";
import { getProjectGrants } from "@/services/project-grants.service";
import { getProjectImpacts, type ProjectImpact } from "@/services/project-impacts.service";
import { getProjectUpdates } from "@/services/project-updates.service";
import type { Grant } from "@/types/v2/grant";
import type { Project as ProjectResponse } from "@/types/v2/project";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";
import { projectTag } from "@/utilities/cache/tags";

/**
 * Cached, server-only twins of the project profile's SSR reads.
 *
 * The four loaders themselves stay uncached — `getProject` is imported by
 * `ProjectDialog` and `EndorsementDialog`, both client components, and the
 * grants/impacts/updates services back client hooks too. See the note in
 * `getCommunityData.cached.ts` for why the split is the right shape.
 *
 * `getProjectCachedData` deliberately does NOT get the directive: it calls
 * `notFound()` and `redirect()`, which work by throwing, and caching a function
 * whose result may be a navigation signal is wrong. It calls
 * `getProjectCached` instead, so the fetch is cached and the routing decision
 * stays live.
 *
 * `cacheLife("minutes")` is `{ stale: 300, revalidate: 60, expire: 3600 }` —
 * the 60s revalidate is exactly the `export const revalidate = 60` the project
 * layout carried before the flag, so the CDN cadence is unchanged.
 *
 * Grants and impacts take an explicit `isAuthorized: false`. Both default it to
 * `true`, which routes through `TokenManager` → `cookies()`; that is a request
 * read, and a request read inside `"use cache"` is both illegal and the
 * cache-poisoning case the plan forbids. Passing it explicitly also matches
 * what `getProjectFeed`'s own docstring already claims it fetches — "the
 * anonymous/public view, which is precisely what crawlers see".
 */

export async function getProjectCached(projectIdOrSlug: string): Promise<ProjectResponse | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(projectTag(projectIdOrSlug));

  return getProject(projectIdOrSlug);
}

export async function getProjectGrantsCached(projectIdOrSlug: string): Promise<Grant[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(projectTag(projectIdOrSlug));

  return getProjectGrants(projectIdOrSlug, { isAuthorized: false });
}

export async function getProjectImpactsCached(projectIdOrSlug: string): Promise<ProjectImpact[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(projectTag(projectIdOrSlug));

  return getProjectImpacts(projectIdOrSlug, { isAuthorized: false });
}

export async function getProjectUpdatesCached(
  projectIdOrSlug: string
): Promise<UpdatesApiResponse> {
  "use cache";
  cacheLife("minutes");
  cacheTag(projectTag(projectIdOrSlug));

  return getProjectUpdates(projectIdOrSlug);
}
