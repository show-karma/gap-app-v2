/**
 * Community-level feature flags.
 *
 * Controls which features are available per community (by slug).
 * These are temporary gates — remove entries as features roll out broadly.
 */

/** Communities where the Financials tab is enabled. */
export const FINANCIALS_ENABLED_COMMUNITIES: readonly string[] = ["filecoin"];

/**
 * External "Funding Programs" overview page per community, keyed by slug.
 * Rendered as a nav link in whitelabel mode only — the page lives on the
 * community's own marketing site (e.g. filpgf.io), not in-app.
 */
export const FUNDING_PROGRAMS_OVERVIEW_URLS: Readonly<Record<string, string>> = {
  filecoin: "https://filpgf.io/funding-programs/",
};
