import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticlePublishedDate } from "@/components/Knowledge/ArticlePublishedDate";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata, SITE_URL } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { getKnowledgeArticleDate } from "../articleDates";

export const metadata: Metadata = customMetadata({
  title: "Grant Milestones vs Impact",
  description:
    "Milestones track work done while impact tracks change created. Learn why separating these concepts is critical for honest evaluation of funded projects.",
  path: PAGES.KNOWLEDGE.ARTICLE("milestones-vs-impact"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("milestones-vs-impact");

export default function MilestonesVsImpactPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          { label: "Milestones vs Impact", href: PAGES.KNOWLEDGE.ARTICLE("milestones-vs-impact") },
        ]}
      />
      <ArticleJsonLd
        title="Grant Milestones vs Impact"
        description="Milestones track work done while impact tracks change created. Learn why separating these concepts is critical for honest evaluation of funded projects."
        url={PAGES.KNOWLEDGE.ARTICLE("milestones-vs-impact")}
        datePublished={PUBLISHED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          { name: "Milestones vs Impact", url: PAGES.KNOWLEDGE.ARTICLE("milestones-vs-impact") },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Grant Milestones vs Impact</h1>
          <ArticlePublishedDate date={PUBLISHED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Milestones track work done; impact tracks change created.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Milestones measure execution against commitments, while impact measures outcomes
            produced by that execution.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Milestones</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Controlled by the team</li>
            <li>Time-bound</li>
            <li>Execution-focused</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Impact</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Often delayed</li>
            <li>Influenced by external factors</li>
            <li>Outcome-focused</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why confusing them causes problems</h2>
          <p className="text-gray-700 dark:text-gray-300">
            A project can meet milestones without impact, or create impact while missing milestones.
            Treating them as the same obscures performance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related articles</h2>
          <div className="space-y-1">
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("impact-measurement")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Impact measurement
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("impact-verification")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Impact verification
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("dao-grant-milestones")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → DAO grant milestones
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-lifecycle")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → The grant lifecycle
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-accountability")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant accountability
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Karma's model</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            separates milestone tracking from impact documentation so evaluation remains clear and
            honest.
          </p>
        </section>
      </article>
    </main>
  );
}
