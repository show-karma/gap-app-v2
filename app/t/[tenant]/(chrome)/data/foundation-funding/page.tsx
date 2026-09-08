import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { DatasetJsonLd } from "@/components/Seo/DatasetJsonLd";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { FILINGS_STATS } from "@/src/features/non-profits/lib/stats";
import { formatDate } from "@/utilities/formatDate";
import { customMetadata } from "@/utilities/meta";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import {
  DATA_PAGE_DESCRIPTION,
  DATA_PAGE_FAQS,
  DATA_PAGE_STATS,
  DATA_PAGE_TITLE,
  DATASET_DESCRIPTION,
} from "./content";

export const metadata: Metadata = customMetadata({
  title: DATA_PAGE_TITLE,
  description: DATA_PAGE_DESCRIPTION,
  path: PAGES.DATA.FOUNDATION_FUNDING,
});

const METHODOLOGY_SECTIONS: ReadonlyArray<{ heading: string; body: React.ReactNode }> = [
  {
    heading: "Source",
    body: (
      <>
        The corpus is built from the IRS Form 990 and Form 990-PF e-file releases: the annual
        information returns U.S. tax-exempt organizations and private foundations file with the IRS.
        As works of the U.S. government, the underlying filings are in the public domain. Karma
        ingests the released e-file data and indexes it for search; the index itself and the
        research layer on top of it are Karma&apos;s work.
      </>
    ),
  },
  {
    heading: "What counts as a filing",
    body: (
      <>
        One filing is one return (Form 990 or Form 990-PF) submitted by one organization for one tax
        year. Amended returns supersede the original for that year. The filings count is therefore a
        count of organization-years, not of organizations.
      </>
    ),
  },
  {
    heading: "Coverage and vintages",
    body: (
      <>
        Coverage spans {FILINGS_STATS.historySpanLong} of giving history across organizations whose
        returns the IRS has released as e-file data. Organizations file up to a year or more after
        their tax year ends, so the most recent complete year in the corpus typically trails the
        calendar by one to two years. Small organizations that file the 990-N postcard, paper-only
        filers absent from the e-file releases, and non-U.S. funders are outside the corpus.
      </>
    ),
  },
  {
    heading: "Refresh cadence",
    body: (
      <>
        The index is kept current as the IRS releases new e-filed returns; newly released filings
        are ingested on an ongoing basis rather than on a fixed calendar. The headline figures on
        this page are corpus-level totals verified against the index on the review date shown above,
        not live counters.
      </>
    ),
  },
  {
    heading: "Limitations",
    body: (
      <>
        All amounts are as reported by the filing organization to the IRS and are not independently
        audited. Dollar totals reflect grants as itemized or scheduled in the filings, so reporting
        differences between filers carry through to the totals.
      </>
    ),
  },
];

/**
 * Renders "Find Funders" inside a plain-text FAQ answer as a link to the
 * product page. Visible-only enhancement: the FAQPage JSON-LD keeps the raw
 * string, since schema.org answers are text (same convention as the
 * find-funders FAQ). First occurrence only; answers without the phrase pass
 * through unchanged.
 */
function linkifyFindFunders(answer: string, linkClass: string): React.ReactNode {
  const phrase = "Find Funders";
  const index = answer.indexOf(phrase);
  if (index === -1) {
    return answer;
  }
  return (
    <>
      {answer.slice(0, index)}
      <Link href={NON_PROFITS_PAGES.HOME} className={linkClass}>
        {phrase}
      </Link>
      {answer.slice(index + phrase.length)}
    </>
  );
}

const CANNOT_TELL_YOU: ReadonlyArray<string> = [
  "What a funder will do next. Filings record grants already paid, not future priorities or open funding opportunities.",
  "What happened in the last year or two. The filing lag means the newest grants are often not yet on record.",
  "Anything about funders outside the corpus: 990-N postcard filers, paper-only filers, non-U.S. foundations, and giving that never passes through a reporting entity, such as direct personal gifts.",
  "Whether a nonprofit is effective. The filings describe money flows and governance disclosures, not program quality or impact.",
];

/**
 * Karma's first-party data page for the IRS 990 corpus behind Find Funders
 * (DEV-615). Fully static by design: no public indexer endpoint serves
 * corpus-wide aggregates at request time (verified against the staging
 * OpenAPI spec and MCP tool catalog on 2026-08-04; the philanthropy routes
 * are all entity-scoped or agent queries), so every figure renders from
 * FILINGS_STATS, the same reviewed source the find-funders surfaces use,
 * with the verification date visible on the page. When the indexer grows a
 * public aggregates endpoint, this page should fetch it at request time with
 * ISR instead.
 */
export default function FoundationFundingDataPage() {
  const linkClass = "text-blue-600 underline underline-offset-2 dark:text-blue-400";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 md:py-14">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Foundation funding data", href: PAGES.DATA.FOUNDATION_FUNDING },
        ]}
      />
      <DatasetJsonLd
        name={DATA_PAGE_TITLE}
        description={DATASET_DESCRIPTION}
        url={PAGES.DATA.FOUNDATION_FUNDING}
        isBasedOn={["IRS Form 990 e-file corpus", "IRS Form 990-PF e-file corpus"]}
        keywords={["IRS 990", "990-PF", "foundation grants", "philanthropy data", "nonprofits"]}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Foundation funding data", url: PAGES.DATA.FOUNDATION_FUNDING },
        ]}
      />
      <FAQJsonLd questions={DATA_PAGE_FAQS} />

      <article>
        {/* Header: asymmetric two-column on desktop, the dataset described like a report cover. */}
        <header className="mt-6 grid gap-6 md:mt-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-400">
              Karma data
            </p>
            <h1 className="mt-3 text-balance text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-foreground">
              {DATA_PAGE_TITLE}
            </h1>
          </div>
          <div className="flex flex-col justify-end gap-3 md:pb-1.5">
            <p className="max-w-[52ch] text-pretty text-base leading-7 text-muted-foreground">
              {DATASET_DESCRIPTION}
            </p>
            <p className="text-sm text-muted-foreground/80">
              Figures last reviewed on{" "}
              <time dateTime={FILINGS_STATS.figuresReviewedOn}>
                {formatDate(FILINGS_STATS.figuresReviewedOn, "UTC")}
              </time>
              .
            </p>
          </div>
        </header>

        {/* The numbers ARE the page: a full-width figure band, no cards. */}
        <section aria-labelledby="numbers-heading" className="mt-16 md:mt-24">
          <h2 id="numbers-heading" className="sr-only">
            The numbers, defined
          </h2>
          <dl className="grid gap-y-12 border-t border-border md:grid-cols-3 md:gap-x-10">
            {DATA_PAGE_STATS.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "pt-8",
                  index > 0 && "md:border-l md:border-border md:pl-10",
                  index === 0 && "border-t-2 border-t-primary-500 md:-mt-px"
                )}
              >
                <dt className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground md:min-h-10">
                  {stat.label}
                </dt>
                <dd className="m-0">
                  <span className="block text-[clamp(2.75rem,2rem+2.5vw,4rem)] font-bold leading-none tracking-tight text-foreground tabular-nums">
                    {stat.value}
                  </span>
                  <p className="mt-5 max-w-[46ch] text-sm leading-6 text-muted-foreground">
                    {stat.definition}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Methodology: a documented record. Two-column ledger rows, not a prose wall. */}
        <section aria-labelledby="methodology-heading" className="mt-20 md:mt-28">
          <h2
            id="methodology-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Methodology
          </h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {METHODOLOGY_SECTIONS.map((section) => (
              <div
                key={section.heading}
                className="grid gap-2 py-7 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-10"
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground md:pt-0.5">
                  {section.heading}
                </h3>
                <p className="max-w-[68ch] text-base leading-7 text-muted-foreground">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The honest section is the credibility section: give it numbered weight. */}
        <section aria-labelledby="cannot-heading" className="mt-20 md:mt-28">
          <h2 id="cannot-heading" className="text-2xl font-bold tracking-tight text-foreground">
            What this data cannot tell you
          </h2>
          <ol className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {CANNOT_TELL_YOU.map((item, index) => (
              <li key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                <span
                  aria-hidden="true"
                  className="pt-0.5 text-2xl font-bold leading-none text-primary-500/70 tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="max-w-[52ch] text-base leading-7 text-muted-foreground">{item}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ: visible definition list, tight editorial rhythm. */}
        <section aria-labelledby="faq-heading" className="mt-20 md:mt-28">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-foreground">
            Common questions
          </h2>
          <dl className="mt-8 max-w-3xl space-y-10">
            {DATA_PAGE_FAQS.map((faq) => (
              <div key={faq.question}>
                <dt className="text-lg font-semibold text-foreground">{faq.question}</dt>
                <dd className="m-0 mt-2 max-w-[68ch] text-base leading-7 text-muted-foreground">
                  {linkifyFindFunders(faq.answer, linkClass)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Closing: one quiet, tinted destination block. */}
        {/* Negative margins mirror the inner padding so the text stays on the
            page's content edge while the tint bleeds past it. */}
        <section
          aria-labelledby="use-heading"
          className="-mx-4 mt-20 rounded-2xl bg-primary-500/5 px-4 py-8 dark:bg-primary-400/10 sm:-mx-6 sm:px-6 md:-mx-10 md:mt-28 md:px-10 md:py-10"
        >
          <h2 id="use-heading" className="text-2xl font-bold tracking-tight text-foreground">
            Use the data
          </h2>
          <p className="mt-3 max-w-[62ch] text-base leading-7 text-muted-foreground">
            <Link href={NON_PROFITS_PAGES.HOME} className={linkClass}>
              Karma Find Funders
            </Link>{" "}
            searches this corpus conversationally and cites the source filing behind every answer.
            For how advisors verify organizations before recommending a grant, see{" "}
            <Link href={PAGES.KNOWLEDGE.ARTICLE("nonprofit-due-diligence")} className={linkClass}>
              nonprofit due diligence
            </Link>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
