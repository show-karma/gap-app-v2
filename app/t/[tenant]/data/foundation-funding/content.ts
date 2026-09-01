import { FILINGS_STATS } from "@/src/features/non-profits/lib/stats";

/**
 * Copy for /data/foundation-funding, Karma's first-party data page about the
 * IRS 990 corpus behind Find Funders (DEV-615, dataset blessed on DEV-613).
 *
 * Rules for this file:
 * - Every number renders from FILINGS_STATS (src/features/non-profits/lib/stats.ts),
 *   the same source the find-funders marketing surfaces use. Never inline a
 *   corpus figure as a literal here; the page's SSR test greps this file and
 *   page.tsx for hardcoded corpus numbers and fails if it finds one.
 * - The FAQ array below feeds both the visible FAQ section and the FAQPage
 *   JSON-LD, so the structured data never claims something a reader cannot
 *   see (same contract as src/features/non-profits/lib/faq-content.ts).
 * - No em dashes in any string. The SSR test asserts this on rendered text.
 */

export const DATA_PAGE_TITLE = "Foundation Funding Data from IRS 990 Filings";

export const DATA_PAGE_DESCRIPTION = `How Karma indexes IRS Form 990 and 990-PF filings: over ${FILINGS_STATS.countLong} filings, ${FILINGS_STATS.dollarsTracked} in tracked grantmaking dollars, and ${FILINGS_STATS.historySpanLong} of giving history, with methodology, definitions, and limitations.`;

/** One-paragraph dataset description shared by the visible summary and the Dataset JSON-LD. */
export const DATASET_DESCRIPTION = `An index of IRS Form 990 and 990-PF filings for U.S. private foundations and public charities: over ${FILINGS_STATS.countLong} filings covering ${FILINGS_STATS.dollarsTracked} in tracked grantmaking dollars and ${FILINGS_STATS.historySpanLong} of giving history, kept current as new filings are published.`;

interface DataPageStat {
  /** The headline figure, from FILINGS_STATS. */
  value: string;
  /** Short label under the figure. */
  label: string;
  /** Inline definition: exactly what the figure counts and does not count. */
  definition: string;
}

export const DATA_PAGE_STATS: DataPageStat[] = [
  {
    value: FILINGS_STATS.countShort,
    label: "filings indexed",
    definition: `A filing is one annual information return, a Form 990 or Form 990-PF, submitted by one organization for one tax year and released by the IRS as e-file data. Over ${FILINGS_STATS.countLong} such returns are indexed. The count grows as the IRS releases new filings; it is not a count of organizations, since one organization contributes one filing per year.`,
  },
  {
    value: FILINGS_STATS.dollarsTracked,
    label: "grantmaking dollars tracked",
    definition: `The total dollar value of grants reported across the indexed filings, as filed. Form 990-PF filings itemize each grant a private foundation paid; Form 990 filings report grants made through their schedules. Amounts are what organizations reported to the IRS, not independently audited figures.`,
  },
  {
    value: FILINGS_STATS.historySpanLong,
    label: "of giving history",
    definition: `The span of tax years the indexed filings cover. Because organizations file up to a year or more after their tax year ends, the most recent complete year in the corpus typically trails the calendar by one to two years.`,
  },
];

interface DataPageFaqEntry {
  question: string;
  answer: string;
}

export const DATA_PAGE_FAQS: DataPageFaqEntry[] = [
  {
    question: "Where does this data come from?",
    answer:
      "From the IRS Form 990 and Form 990-PF e-file corpus, the annual information returns U.S. tax-exempt organizations and private foundations file with the IRS. As works of the U.S. government, the underlying filings are in the public domain. Karma ingests the released e-file data and indexes it for search.",
  },
  {
    question: "How current is the data?",
    answer:
      "The index is kept current as the IRS releases new e-filed returns. Filings themselves lag reality: an organization files months to more than a year after its tax year closes, so the most recent complete year in the corpus typically trails the calendar by one to two years. Recent grants may not appear until the funder's next return is released.",
  },
  {
    question: "Which organizations are covered?",
    answer:
      "U.S. private foundations that file Form 990-PF and public charities that file Form 990, where the IRS has released the return as e-file data. Organizations below the filing threshold (990-N postcard filers), paper-only filers whose returns are not in the e-file releases, and non-U.S. funders are not covered.",
  },
  {
    question: "How can I search this data?",
    answer:
      "Through Karma Find Funders, a research agent that answers funder questions from the indexed filings and cites the source filing for each answer. Asking questions is free for nonprofits, on the site or through the MCP connector for AI assistants.",
  },
];
