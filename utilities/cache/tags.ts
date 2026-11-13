/**
 * Cache tags for the `"use cache"` loaders behind the crawlable (Cache-class)
 * routes.
 *
 * The tag is the handle an invalidator needs: `revalidateTag(communityTag(slug))`
 * drops exactly one community's cached payload instead of waiting out the
 * `cacheLife` window. Building them here rather than inline means the producer
 * and a future consumer cannot drift apart on the string.
 *
 * Project tags are the only ones with an invalidator today: gap-indexer reports
 * changed projects to `app/api/cache/projects/revalidate`, which calls
 * `revalidateTag(projectTag(uid))`. The others are hooks: nothing calls
 * `revalidateTag` with them yet, so those loaders still refresh on their
 * `cacheLife` window alone.
 *
 * Prefixes are namespaced so two entity kinds can never collide on a bare id.
 */

/** One community, by slug. */
export const communityTag = (slug: string): string => `community:${slug}`;

/** One community's project list, which changes far more often than the community. */
export const communityProjectsTag = (slug: string): string => `community-projects:${slug}`;

/**
 * One project, by uid or slug. Lower-cased because uids arrive in either case
 * (routes, API responses, the indexer's notices) and a tag must match exactly.
 */
export const projectTag = (projectIdOrSlug: string): string =>
  `project:${projectIdOrSlug.toLowerCase()}`;

/** One funding program, by the composite id the registry uses. */
export const programTag = (programId: string): string => `program:${programId}`;

/** The program registry as a list: the funding map and the per-community grids. */
export const programListTag = (): string => "program-list";

/** The explorer's project list. */
export const projectListTag = (): string => "project-list";
