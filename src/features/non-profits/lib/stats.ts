/**
 * Indexed-filings stats surfaced across the find-funders UI. Centralized so the
 * count and phrasing stay consistent across navbar, search spinner, landing
 * hero, and chat composer footer.
 *
 * Source: IRS 990 + 990-PF filings ingested by the Karma indexer.
 */
export const FILINGS_STATS = {
  countShort: "2M+",
  searchingProgressLabel: "searching over 2 million filings…",
  indexedShortLabel: "Over 2M filings · $1.2T tracked",
  indexedLabel: "Over 2M filings indexed",
} as const;
