/**
 * Route that serves a community logo the indexer stores inline as a `data:`
 * URI (`app/api/community-logo/[slug]/[hash]`). Shared by the server code that
 * links to it and by `ProfilePicture`, which must accept these same-origin
 * paths — and only these — as image sources.
 */
export const COMMUNITY_LOGO_ROUTE = "/api/community-logo";

/** Whether `url` is a path served by the community logo route. */
export function isCommunityLogoPath(url: string): boolean {
  return url.startsWith(`${COMMUNITY_LOGO_ROUTE}/`);
}
