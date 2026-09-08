/**
 * Cache tags for the `"use cache"` loaders behind the crawlable (Cache-class)
 * routes.
 *
 * The tag is the handle an invalidator needs: `revalidateTag(communityTag(slug))`
 * drops exactly one community's cached payload instead of waiting out the
 * `cacheLife` window. Building them here rather than inline means the producer
 * and a future consumer cannot drift apart on the string.
 *
 * NOTE: nothing calls `revalidateTag` with these yet. The only revalidation
 * webhook in the app is `app/api/blog/revalidate/route.ts`, which is blog-only
 * and works by path. So today these tags are the hook, not a working
 * invalidation path — the loaders still self-heal on the `cacheLife` window
 * (60s revalidate). Wiring an indexer-side webhook to `revalidateTag` is the
 * other half and is not part of this PR.
 *
 * Prefixes are namespaced so two entity kinds can never collide on a bare id.
 */

/** One community, by slug. */
export const communityTag = (slug: string): string => `community:${slug}`;

/** One community's project list, which changes far more often than the community. */
export const communityProjectsTag = (slug: string): string => `community-projects:${slug}`;

/** One project, by uid or slug — whichever the caller routed on. */
export const projectTag = (projectIdOrSlug: string): string => `project:${projectIdOrSlug}`;

/** One funding program, by the composite id the registry uses. */
export const programTag = (programId: string): string => `program:${programId}`;

/** The program registry as a list: the funding map and the per-community grids. */
export const programListTag = (): string => "program-list";

/** The explorer's project list. */
export const projectListTag = (): string => "project-list";
