import { PAGES } from "./pages";

/**
 * App route TEMPLATES (with `:param` placeholders) for the Karma agent backend.
 *
 * Generated from `PAGES` so they always reflect the real FE routes — this is
 * the single source of truth. Served (crawler-disallowed) via
 * `app/sitemaps/app-routes/sitemap.ts` so the backend can FETCH the routes
 * instead of hardcoding a copy. Only stable, user-facing entity routes the
 * agent links to are included — not every app page.
 *
 * Placeholders use `:paramName` (URL-safe) so the backend can substitute the
 * real slug / id it gets from its tools.
 */
const PROJECT_SLUG = ":projectSlug";
const GRANT_UID = ":grantUID";
const COMMUNITY_SLUG = ":communitySlug";
const PROGRAM_ID = ":programId";
const APPLICATION_ID = ":applicationId";
const PROJECT_UID = ":projectUID";

export const APP_ROUTE_TEMPLATES: readonly string[] = [
  // Top-level
  PAGES.PROJECTS_EXPLORER,
  PAGES.COMMUNITIES,
  PAGES.MY_PROJECTS,
  PAGES.MY_REVIEWS,
  // Project
  PAGES.PROJECT.OVERVIEW(PROJECT_SLUG),
  PAGES.PROJECT.ABOUT(PROJECT_SLUG),
  PAGES.PROJECT.TEAM(PROJECT_SLUG),
  PAGES.PROJECT.IMPACT.ROOT(PROJECT_SLUG),
  // Grant (= project with that grant selected)
  PAGES.PROJECT.GRANTS(PROJECT_SLUG),
  PAGES.PROJECT.GRANT(PROJECT_SLUG, GRANT_UID),
  PAGES.PROJECT.MILESTONES_AND_UPDATES(PROJECT_SLUG, GRANT_UID),
  // Community / program / application
  PAGES.COMMUNITY.ALL_GRANTS(COMMUNITY_SLUG),
  PAGES.COMMUNITY.FUNDING_OPPORTUNITIES(COMMUNITY_SLUG),
  PAGES.COMMUNITY.PROGRAM_DETAIL(COMMUNITY_SLUG, PROGRAM_ID),
  PAGES.COMMUNITY.APPLICATION_DETAIL(COMMUNITY_SLUG, APPLICATION_ID),
  // Reviewer milestone page (deep-link a specific milestone by appending
  // `#milestone-<milestoneUID>` — the backend adds the anchor)
  PAGES.MANAGE.FUNDING_PLATFORM.MILESTONES(COMMUNITY_SLUG, PROGRAM_ID, PROJECT_UID),
];
