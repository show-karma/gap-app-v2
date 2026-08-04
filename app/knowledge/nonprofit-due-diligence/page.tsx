import type { Metadata } from "next";
import Link from "next/link";
import { getKnowledgeArticleDate } from "@/app/knowledge/articleDates";
import { RESEARCH_FAQS } from "@/app/knowledge/nonprofit-due-diligence/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticlePublishedDate } from "@/components/Knowledge/ArticlePublishedDate";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

const ARTICLE_TITLE = "Nonprofit Due Diligence for Donor Advisors";
const ARTICLE_DESCRIPTION =
  "How donor advisors verify nonprofits before recommending a grant: IRS Pub 78 status, Form 990 recency, California AG registry, governance signals, and ranked shortlists built from over 2 million IRS filings.";

export const metadata: Metadata = customMetadata({
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  path: PAGES.KNOWLEDGE.ARTICLE("nonprofit-due-diligence"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("nonprofit-due-diligence");

export default function NonprofitDueDiligencePage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          {
            label: "Nonprofit due diligence",
            href: PAGES.KNOWLEDGE.ARTICLE("nonprofit-due-diligence"),
          },
        ]}
      />
      <ArticleJsonLd
        title={ARTICLE_TITLE}
        description={ARTICLE_DESCRIPTION}
        url={PAGES.KNOWLEDGE.ARTICLE("nonprofit-due-diligence")}
        datePublished={PUBLISHED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          {
            name: "Nonprofit due diligence",
            url: PAGES.KNOWLEDGE.ARTICLE("nonprofit-due-diligence"),
          },
        ]}
      />
      <FAQJsonLd questions={RESEARCH_FAQS} />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Nonprofit Due Diligence for Donor Advisors</h1>
          <ArticlePublishedDate date={PUBLISHED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Nonprofit due diligence is how a donor advisor verifies that an organization is
            legitimate, in good standing, and still active before recommending a grant.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Diligence for a grant recommendation rests on public records: the IRS Publication 78
            list of organizations eligible to receive tax-deductible contributions, the
            organization's most recent Form 990 filing, state charity-registry status where one
            applies, and governance signals disclosed in the filing itself.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Because filings lag reality by a year or more, good diligence also pairs the paper
            record with live activity signals: whether the organization maintains an active website,
            a social presence, and recent evidence of impact.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            The questions below cover how these checks work in practice and how they run inside
            Karma Nonprofit Research, the shortlisting tool behind this article.
          </p>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-bold">Common questions</h2>
          {RESEARCH_FAQS.map((faq) => (
            <section key={faq.question} className="space-y-4">
              <h3 className="text-lg font-semibold">{faq.question}</h3>
              <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
            </section>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related articles</h2>
          <div className="space-y-1">
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("impact-verification")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Impact verification
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-accountability")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant accountability
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("ai-grant-evaluation")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → AI-assisted grant evaluation
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Karma&apos;s role</h2>
          <p className="text-gray-700 dark:text-gray-300">
            The checks described here are implemented in{" "}
            <Link
              href="/nonprofit-research"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma Nonprofit Research
            </Link>
            , which runs them across every candidate on a shortlist and shows the evidence for each
            verdict inline, so an advisor can hand a donor a recommendation with the diligence
            already documented.
          </p>
        </section>
      </article>
    </main>
  );
}
