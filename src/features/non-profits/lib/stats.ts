/**
 * Indexed-filings stats surfaced across the find-funders UI. Single source of
 * truth for the count and phrasing so the navbar, search spinner, landing
 * hero, chat composer footer, and stats grid stay in sync.
 *
 * Source: IRS 990 + 990-PF filings ingested by the Karma indexer.
 */
export const FILINGS_STATS = {
  /** Abbreviated count for the hero stats grid. */
  countShort: "2M+",
  /** Spelled-out count for prose copy (e.g. FAQ answers). */
  countLong: "2 million",
  /** Total grantmaking dollars tracked across indexed filings. */
  dollarsTracked: "$1.2T",
  /** Streaming spinner copy in chat / progress view (sentence fragment, lowercase). */
  searchingProgressLabel: "searching over 2 million filings…",
  /** Footer hint under the chat composer (sentence fragment, lowercase). */
  composerFooterLabel: "over 2M filings indexed",
  /** Navbar status pill and short hero stat (title case). */
  indexedLabel: "Over 2M filings indexed",
  /** Hero metadata strip combining count + dollars (title case). */
  indexedShortLabel: "Over 2M filings · $1.2T tracked",
} as const;
