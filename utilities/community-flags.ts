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

/**
 * Communities where notebook pages are enabled. Gates the
 * `/community/<id>/notebooks` routes — every other community gets a "not
 * available" state there, matching {@link FINANCIALS_ENABLED_COMMUNITIES} —
 * and the explorer tab that points at them.
 */
export const NOTEBOOKS_ENABLED_COMMUNITIES: readonly string[] = ["filecoin"];

/** Per-community tweaks to the community explorer tab bar. */
type ExplorerNavOverride = {
  /** Navigation item ids to drop from the tab bar entirely. */
  readonly hiddenTabs?: readonly CommunityNavItemId[];
  /** Navigation item id -> replacement tab label. */
  readonly tabLabels?: Readonly<Partial<Record<CommunityNavItemId, string>>>;
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
    // navbar under Funding and Reports. Funded projects are reachable from the
    // navbar's Funding -> Grants entries, though those are program-scoped —
    // the unfiltered list is only linked from filpgf.io itself.
    // Notebooks is in the filpgf.io navbar under Reports, so the tab would
    // duplicate it there. On karmahq.org the tab stays — it is the only way in.
    hiddenTabs: ["community-projects", "reports", "financials", "notebooks"],
    tabLabels: { "browse-applications": "Browse Projects" },
  },
};

/**
 * Communities whose project explorer is browsed by Track (a community's
 * funding initiatives, e.g. Kernel / R&D / Revenue Development) instead of by
 * Program (a funding round, e.g. Batch 1/2/3). For these communities the
 * explorer's primary dropdown lists the community's tracks and writes the
 * `trackIds` URL param instead of `programId`; the program/batch dropdown is
 * not shown. Label text stays "Choose Program" — the tenant's own vocabulary
 * calls tracks "funding programs".
 *
 * Keyed by the `communityId` ROUTE PARAM (the slug as it appears in the URL),
 * same caveat as {@link EXPLORER_NAV_OVERRIDES}.
 */
export const TRACKS_AS_PRIMARY_EXPLORER_FACET: readonly string[] = ["filecoin"];

/** Whether the explorer for this community should be browsed by Track instead of Program. */
export const isTracksAsPrimaryExplorerFacet = (communityId: string): boolean =>
  TRACKS_AS_PRIMARY_EXPLORER_FACET.includes(communityId);
