import type { Metadata } from "next";
import Link from "next/link";
import {
  DATA_PAGE_DESCRIPTION,
  DATA_PAGE_FAQS,
  DATA_PAGE_STATS,
  DATA_PAGE_TITLE,
  DATASET_DESCRIPTION,
} from "@/app/data/foundation-funding/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { DatasetJsonLd } from "@/components/Seo/DatasetJsonLd";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { FILINGS_STATS } from "@/src/features/non-profits/lib/stats";
import { formatDate } from "@/utilities/formatDate";
import { customMetadata } from "@/utilities/meta";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";

export const metadata: Metadata = customMetadata({
  title: DATA_PAGE_TITLE,
  description: DATA_PAGE_DESCRIPTION,
  path: PAGES.DATA.FOUNDATION_FUNDING,
});

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
  const linkClass = "text-blue-600 hover:underline dark:text-blue-400";

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
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
      <article className="space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">{DATA_PAGE_TITLE}</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">{DATASET_DESCRIPTION}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Figures last reviewed on{" "}
            <time dateTime={FILINGS_STATS.figuresReviewedOn}>
              {formatDate(FILINGS_STATS.figuresReviewedOn, "UTC")}
            </time>
            .
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">The numbers, defined</h2>
          {DATA_PAGE_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <p className="text-2xl font-bold">
                {stat.value} <span className="text-base font-medium">{stat.label}</span>
              </p>
              <p className="mt-2 text-gray-700 dark:text-gray-300">{stat.definition}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Methodology</h2>
          <h3 className="text-lg font-semibold">Source</h3>
          <p className="text-gray-700 dark:text-gray-300">
            The corpus is built from the IRS Form 990 and Form 990-PF e-file releases: the annual
            information returns U.S. tax-exempt organizations and private foundations file with the
            IRS. As works of the U.S. government, the underlying filings are in the public domain.
            Karma ingests the released e-file data and indexes it for search; the index itself and
            the research layer on top of it are Karma&apos;s work.
          </p>
          <h3 className="text-lg font-semibold">What counts as a filing</h3>
          <p className="text-gray-700 dark:text-gray-300">
            One filing is one return (Form 990 or Form 990-PF) submitted by one organization for one
            tax year. Amended returns supersede the original for that year. The filings count is
            therefore a count of organization-years, not of organizations.
          </p>
          <h3 className="text-lg font-semibold">Coverage and vintages</h3>
          <p className="text-gray-700 dark:text-gray-300">
            Coverage spans {FILINGS_STATS.historySpanLong} of giving history across organizations
            whose returns the IRS has released as e-file data. Organizations file up to a year or
            more after their tax year ends, so the most recent complete year in the corpus typically
            trails the calendar by one to two years. Small organizations that file the 990-N
            postcard, paper-only filers absent from the e-file releases, and non-U.S. funders are
            outside the corpus.
          </p>
          <h3 className="text-lg font-semibold">Refresh cadence</h3>
          <p className="text-gray-700 dark:text-gray-300">
            The index is kept current as the IRS releases new e-filed returns; newly released
            filings are ingested on an ongoing basis rather than on a fixed calendar. The headline
            figures on this page are corpus-level totals verified against the index on the review
            date shown above, not live counters.
          </p>
          <h3 className="text-lg font-semibold">Limitations</h3>
          <p className="text-gray-700 dark:text-gray-300">
            All amounts are as reported by the filing organization to the IRS and are not
            independently audited. Dollar totals reflect grants as itemized or scheduled in the
            filings, so reporting differences between filers carry through to the totals.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">What this data cannot tell you</h2>
          <ul className="list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
            <li>
              What a funder will do next. Filings record grants already paid, not future priorities
              or open funding opportunities.
            </li>
            <li>
              What happened in the last year or two. The filing lag means the newest grants are
              often not yet on record.
            </li>
            <li>
              Anything about funders outside the corpus: 990-N postcard filers, paper-only filers,
              non-U.S. foundations, and giving that never passes through a reporting entity, such as
              direct personal gifts.
            </li>
            <li>
              Whether a nonprofit is effective. The filings describe money flows and governance
              disclosures, not program quality or impact.
            </li>
          </ul>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-bold">Common questions</h2>
          {DATA_PAGE_FAQS.map((faq) => (
            <section key={faq.question} className="space-y-3">
              <h3 className="text-lg font-semibold">{faq.question}</h3>
              <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
            </section>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Use the data</h2>
          <p className="text-gray-700 dark:text-gray-300">
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
