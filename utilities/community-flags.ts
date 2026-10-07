/**
 * Community-level feature flags.
 *
 * Controls which features are available per community (by slug).
 * These are temporary gates — remove entries as features roll out broadly.
 */

import type { CommunityNavItemId } from "./community-nav";

/**
 * Communities where the Commitments & Disbursements (financials) feature is
 * enabled. It gates two things together: the `/community/<id>/financials` route
 * — every other community gets a "not available" state there — and the explorer
 * tab that points at it.
 *
 * Whether an enabled community *shows* that tab on a given host is a separate
 * decision: see {@link EXPLORER_NAV_OVERRIDES}.
 */
export const FINANCIALS_ENABLED_COMMUNITIES: readonly string[] = ["filecoin"];

/** Per-community tweaks to the community explorer tab bar. */
type ExplorerNavOverride = {
  /** Navigation item ids to drop from the tab bar entirely. */
  readonly hiddenTabs?: readonly CommunityNavItemId[];
  /** Navigation item id -> replacement tab label. */
  readonly tabLabels?: Readonly<Partial<Record<CommunityNavItemId, string>>>;
  /**
   * Navigation item id -> replacement destination, as the host-relative path a
   * whitelabel visitor sees. For a tab the tenant has renamed: a URL that
   * contradicts the tab that led to it is what gets copied out of the address
   * bar and shared.
   *
   * These are `WHITELABEL_ROUTE_ALIASES` keys, which only resolve on a tenant
   * host — which is also why they are bare paths rather than `PAGES` builders:
   * this table stays free of runtime imports (see `community-nav.ts`), and a
   * `/community/<slug>/...` builder would imply a URL that does not exist.
   */
  readonly tabPaths?: Readonly<Partial<Record<CommunityNavItemId, string>>>;
};

/**
 * Explorer tab overrides, keyed by the `communityId` ROUTE PARAM (the slug as it
 * appears in the URL) — not by the community's canonical slug or UID. A community
 * addressed by UID therefore falls through to the default tabs, the same known
 * limitation {@link FINANCIALS_ENABLED_COMMUNITIES} already has.
 *
 * APPLIED ON WHITELABEL HOSTS ONLY. The entries below hide tabs whose
 * destinations the tenant's own navbar already carries (see
 * `tenant-config.ts`), which is only true on that navbar's host. On
 * karmahq.org/community/<slug> there is no such navbar, so hiding a tab there
 * would leave a live route with no in-app entry point at all — the tab bar is
 * the only way in. Callers must gate the lookup on `isWhitelabel`.
 */
export const EXPLORER_NAV_OVERRIDES: Readonly<Partial<Record<string, ExplorerNavOverride>>> = {
  filecoin: {
    // Commitments & Disbursements and every report type are in the filpgf.io
    // navbar under Funding and Reports. Applications are reached per program:
    // every program's details page carries a "View applications" link into
    // the (still served) /browse-applications list, so the cross-program tab
    // goes.
    hiddenTabs: ["browse-applications", "reports", "financials"],
    // This tenant funds projects and says so everywhere: the landing site's
    // "Projects Explorer" (filecoin-grants `src/data/nav.ts`), the tenant
    // navbar's entry of the same name, and this tab all arrive at the funded
    // projects listing, under the same name and at the same URL.
    tabLabels: { "community-projects": "Browse Projects" },
    tabPaths: { "community-projects": "/browse-projects" },
  },
};

/**
 * Communities whose funded-projects explorer carries a Track dropdown beside
 * the Program one at all times, listing the community's tracks (its funding
 * initiatives, e.g. Kernel / R&D / Revenue Development) rather than the
 * program-scoped tracks the default explorer shows only once a program is
 * chosen. The two filters combine: `programId` and `trackIds` both go to the
 * API.
 *
 * APPLIED ON WHITELABEL HOSTS ONLY, keyed by the `communityId` ROUTE PARAM —
 * same caveats as {@link EXPLORER_NAV_OVERRIDES}.
 */
export const COMMUNITY_TRACK_FACET_COMMUNITIES: readonly string[] = ["filecoin"];

/** Whether this community's explorer, on the host being rendered, shows the community track dropdown. */
export const hasCommunityTrackFacet = (communityId: string, isWhitelabel: boolean): boolean =>
  isWhitelabel && COMMUNITY_TRACK_FACET_COMMUNITIES.includes(communityId);
