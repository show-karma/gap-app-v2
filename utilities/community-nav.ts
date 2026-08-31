/**
 * Ids and labels for the sections of the community explorer.
 *
 * Three things have to agree about a section's name: the explorer tab bar
 * ({@link ../components/Pages/Communities/CommunityPageNavigator}), the page
 * that tab points at (its `<h1>` and metadata), and the per-community
 * overrides in `community-flags.ts`. When each kept its own copy of the
 * string, a rename half-landed — the tab said one thing and the page another.
 * They all read from here instead.
 *
 * This module deliberately imports nothing from the app: `community-flags.ts`
 * needs the id union and the navigator needs both that and the labels, so
 * anything either of them imports would close a cycle.
 */

/**
 * The name the financials section goes by in the product. The route, the
 * component and the flag are all still called "financials"; only the wording
 * shown to people changed, so this is the one place that wording lives.
 */
export const COMMITMENTS_AND_DISBURSEMENTS = "Commitments & Disbursements";

/**
 * Default label for every tab the explorer knows about, in the order the bar
 * renders them, before any per-community override.
 */
export const COMMUNITY_NAV_LABELS = {
  "funding-opportunities": "Funding opportunities",
  "browse-applications": "Browse applications",
  "community-projects": "View funded projects",
  "milestone-updates": "Milestone updates",
  impact: "Impact",
  reports: "Reports",
  financials: COMMITMENTS_AND_DISBURSEMENTS,
} as const;

/**
 * Ids of the tabs above. Typing an override map's keys against this union is
 * what makes a typo — or a tab that was renamed out from under it — a compile
 * error rather than a silent no-op.
 */
export type CommunityNavItemId = keyof typeof COMMUNITY_NAV_LABELS;
