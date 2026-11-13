import "server-only";

import type { DehydratedState } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { projectUpdatesQueryKey } from "@/hooks/v2/useProjectUpdates";
import { getProject } from "@/services/project.service";
import { getProjectGrants } from "@/services/project-grants.service";
import { getProjectImpacts, type ProjectImpact } from "@/services/project-impacts.service";
import { getProjectUpdates } from "@/services/project-updates.service";
import type { Grant } from "@/types/v2/grant";
import type { Project as ProjectResponse } from "@/types/v2/project";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";
import { buildDehydratedState } from "@/utilities/cache/hydration-seed";
import { projectTag } from "@/utilities/cache/tags";
import { replaceInlineCommunityLogos } from "@/utilities/community-logo.server";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { getCommunityDetailsCached } from "@/utilities/queries/v2/getCommunityData.cached";
import { QUERY_KEYS } from "@/utilities/queryKeys";

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
 * Every loader here uses `PROJECT_PAGE_CACHE_LIFE`: a day before revalidating,
 * a week before expiring. That is only safe because of the tags below; see the
 * constant.
 *
 * Every entry is also tagged with the project's uid and slug, whichever id the
 * route used (`tagProject`). The indexer reports changed projects by uid to
 * `app/api/cache/projects/revalidate`, so one `revalidateTag(projectTag(uid))`
 * has to reach the entries of a page opened by slug as well.
 *
 * Grants, impacts and updates all take an explicit `isAuthorized: false`. Both default it to
 * `true`, which routes through `TokenManager` → `cookies()`; that is a request
 * read, and a request read inside `"use cache"` is both illegal and the
 * cache-poisoning case the plan forbids. Passing it explicitly also matches
 * what `getProjectFeed`'s own docstring already claims it fetches — "the
 * anonymous/public view, which is precisely what crawlers see".
 */

/**
 * Cache lifetime for everything a project page reads.
 *
 * `revalidate` is a day. Edits do not wait for it: gap-indexer reports every
 * write to a project or its grants to `app/api/cache/projects/revalidate`,
 * which expires the project's entries at once (`tagAndSetLifetime` makes sure
 * every entry carries the project's uid). The day is only the bound for a
 * change no notice covered: a failed notice after its retries, or data the
 * indexer's repositories do not write (a community's name or logo, a member's
 * profile, one-off maintenance scripts).
 *
 * Why not shorter: a project page is visited every day or two, so with a
 * 60-second revalidate nearly every visit rebuilt it in the background and
 * stored it again, an ISR write with nothing changed. With a day, a revisit
 * is served from the cache.
 *
 * `expire` is a week: past `revalidate` the page is still served from the
 * cache while it rebuilds in the background, instead of being rebuilt
 * synchronously and written again. With JavaScript, the client refetches the
 * seeded queries on mount, so a visitor sees current data right away; crawlers
 * and no-JS readers see the cached page.
 *
 * `stale` (300 s) is the client router's: how long a visited page is reused on
 * back/forward navigation in the same tab.
 */
export const PROJECT_PAGE_CACHE_LIFE = {
  stale: 300,
  revalidate: 24 * 60 * 60,
  expire: 7 * 24 * 60 * 60,
} as const;

/**
 * Tags the current cache entry with every id the project is known by: the id
 * the route used, the uid and the slug. Must run inside a `"use cache"` scope.
 */
function tagProject(projectIdOrSlug: string, project: ProjectResponse | null): void {
  const ids = new Set([projectIdOrSlug, project?.uid, project?.details?.slug]);
  for (const id of ids) {
    if (id) cacheTag(projectTag(id));
  }
}

/**
 * Tags a loader's entry with the project's ids and sets its lifetime. For the
 * loaders whose own response does not carry the project's ids (grants, impacts,
 * updates, the seeds), it reads the cached project entry, which the layout has
 * normally loaded already.
 *
 * If the project cannot be identified (the read failed or there is no such
 * project), the entry gets only the routed id's tag, and so it is kept for
 * minutes, not the project-page lifetime: a notice from the indexer would not
 * reach it. The loader itself carries on, as before.
 */
/** One `cacheLife` call per invocation, as Next requires. */
function setLifetime(projectIdentified: boolean): void {
  if (projectIdentified) cacheLife(PROJECT_PAGE_CACHE_LIFE);
  else cacheLife("minutes");
}

async function tagAndSetLifetime(projectIdOrSlug: string): Promise<void> {
  let project: ProjectResponse | null = null;
  try {
    project = await getProjectCached(projectIdOrSlug);
  } catch {
    // SUPPRESSED: getProject has already reported the failure to Sentry, and
    // this loader must not fail because the tag lookup did.
  }
  tagProject(projectIdOrSlug, project);
  setLifetime(project !== null);
}

export async function getProjectCached(projectIdOrSlug: string): Promise<ProjectResponse | null> {
  "use cache";

  const project = await getProject(projectIdOrSlug, { rethrow: true });
  tagProject(projectIdOrSlug, project);
  // A missing project is cached briefly: the slug may be about to exist (a
  // project being created right now), and no notice arrives for an id the
  // indexer has never seen.
  setLifetime(project !== null);
  return project;
}

export async function getProjectGrantsCached(projectIdOrSlug: string): Promise<Grant[]> {
  "use cache";
  await tagAndSetLifetime(projectIdOrSlug);

  return getProjectGrants(projectIdOrSlug, { isAuthorized: false, rethrow: true });
}

export async function getProjectImpactsCached(projectIdOrSlug: string): Promise<ProjectImpact[]> {
  "use cache";
  await tagAndSetLifetime(projectIdOrSlug);

  return getProjectImpacts(projectIdOrSlug, { isAuthorized: false, rethrow: true });
}

export async function getProjectUpdatesCached(
  projectIdOrSlug: string
): Promise<UpdatesApiResponse> {
  "use cache";
  await tagAndSetLifetime(projectIdOrSlug);

  // Third arg, not second: the second is `milestoneStatus`. Without
  // `isAuthorized: false` this reaches TokenManager -> cookies() *inside* the
  // cache scope, which Next rejects outright.
  const updates = await getProjectUpdates(projectIdOrSlug, undefined, { isAuthorized: false });

  // A community logo stored inline repeats in every grant item of the feed,
  // and this feed is seeded into every project tab. Link the logo instead of
  // embedding it — see utilities/community-logo.server.ts.
  return replaceInlineCommunityLogos(updates, async (slug) => {
    const community = await getCommunityDetailsCached(slug);
    return community?.details?.logoUrl ?? community?.details?.imageURL;
  });
}

/**
 * The project layout's hydration seed, cached whole.
 *
 * Same `cacheLife` and `cacheTag` as the project loaders it seeds from, so the
 * seed expires with the data rather than on its own schedule.
 *
 * Seeding failures stay swallowed, as before: the client hooks refetch, so a
 * failed prefetch costs a skeleton rather than the page.
 */
export async function getProjectSeedCached(projectIdOrSlug: string): Promise<DehydratedState> {
  "use cache";
  await tagAndSetLifetime(projectIdOrSlug);

  return buildDehydratedState(async (queryClient) => {
    try {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.PROJECT.DETAILS(projectIdOrSlug),
          queryFn: () => getProjectCachedData(projectIdOrSlug),
        }),
        queryClient.prefetchQuery({
          // Same key factory the hook uses — a hand-written key silently misses
          // (that is exactly how the previous updates prefetch became a no-op).
          queryKey: projectUpdatesQueryKey(projectIdOrSlug),
          queryFn: () => getProjectUpdatesCached(projectIdOrSlug),
        }),
      ]);
    } catch {
      // Client hooks fetch as the fallback.
    }
  });
}

/**
 * The /project/[projectId]/updates hydration seed, cached whole.
 *
 * Same reason as getProjectSeedCached: prefetchQuery and dehydrate stamp entries
 * with Date.now(), which cacheComponents rejects during prerender, so the seed
 * itself is the cached unit.
 */
export async function getProjectUpdatesSeedCached(
  projectIdOrSlug: string
): Promise<DehydratedState> {
  "use cache";
  await tagAndSetLifetime(projectIdOrSlug);

  return buildDehydratedState(async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.PROJECT.UPDATES(projectIdOrSlug),
      queryFn: () => getProjectUpdatesCached(projectIdOrSlug),
    });
  });
}
