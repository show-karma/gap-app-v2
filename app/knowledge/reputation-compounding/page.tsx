import type { Metadata } from "next";
import Link from "next/link";
import { getKnowledgeArticleDate } from "@/app/knowledge/articleDates";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticlePublishedDate } from "@/components/Knowledge/ArticlePublishedDate";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata, SITE_URL } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

const title = "How Reputation Compounds in Open Funding Systems";
const description =
  "Why reputation acts as cumulative memory in open funding, reducing uncertainty and improving capital allocation. Learn how compounding credibility works.";

export const metadata: Metadata = customMetadata({
  title,
  description,
  path: PAGES.KNOWLEDGE.ARTICLE("reputation-compounding"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("reputation-compounding");

export default function ReputationCompoundingPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          {
            label: "Reputation Compounding",
            href: PAGES.KNOWLEDGE.ARTICLE("reputation-compounding"),
          },
        ]}
      />
      <ArticleJsonLd
        title={title}
        description={description}
        url={PAGES.KNOWLEDGE.ARTICLE("reputation-compounding")}
        datePublished={PUBLISHED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          {
            name: "Reputation Compounding",
            url: PAGES.KNOWLEDGE.ARTICLE("reputation-compounding"),
          },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">How Reputation Compounds in Open Funding Systems</h1>
          <ArticlePublishedDate date={PUBLISHED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Reputation is cumulative memory for funding decisions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            In open funding systems, reputation reduces uncertainty and improves capital allocation
            over time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Without reputation</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Each funding round resets trust to zero.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">With reputation</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Past execution becomes predictive context, lowering evaluation cost and improving
            outcomes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related articles</h2>
          <div className="space-y-1">
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("onchain-reputation")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → What is onchain reputation?
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("project-reputation")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → How projects build reputation through funding
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("project-updates-and-reputation")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Project updates and reputation
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("impact-measurement")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Impact measurement
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Karma's thesis</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Capital should follow credibility, and credibility should be earned through work.{" "}
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Learn more about Karma
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
