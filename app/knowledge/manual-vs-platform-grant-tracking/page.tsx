import type { Metadata } from "next";
import Link from "next/link";
import { getKnowledgeArticleDate } from "@/app/knowledge/articleDates";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticlePublishedDate } from "@/components/Knowledge/ArticlePublishedDate";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata, SITE_URL } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

export const metadata: Metadata = customMetadata({
  title: "Manual vs Platform-Based Grant Tracking",
  description:
    "Compare spreadsheets and documents with dedicated funding platforms for grant tracking. Learn when manual tools break down and when structured platforms scale better.",
  path: PAGES.KNOWLEDGE.ARTICLE("manual-vs-platform-grant-tracking"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("manual-vs-platform-grant-tracking");

export default function ManualVsPlatformGrantTrackingPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          {
            label: "Manual vs Platform Grant Tracking",
            href: PAGES.KNOWLEDGE.ARTICLE("manual-vs-platform-grant-tracking"),
          },
        ]}
      />
      <ArticleJsonLd
        title="Manual vs Platform-Based Grant Tracking"
        description="Compare spreadsheets and documents with dedicated funding platforms for grant tracking. Learn when manual tools break down and when structured platforms scale better."
        url={PAGES.KNOWLEDGE.ARTICLE("manual-vs-platform-grant-tracking")}
        datePublished={PUBLISHED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          {
            name: "Manual vs Platform Grant Tracking",
            url: PAGES.KNOWLEDGE.ARTICLE("manual-vs-platform-grant-tracking"),
          },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Manual vs Platform-Based Grant Tracking</h1>
          <ArticlePublishedDate date={PUBLISHED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Manual tracking optimizes speed; platforms optimize trust.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Manual tools offer flexibility but fail at accountability and learning, while dedicated
            platforms trade flexibility for structure and memory.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Where manual tools work</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Small experiments</li>
            <li>One-off grants</li>
            <li>Early exploration</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Where they fail</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Standardization</li>
            <li>Persistence</li>
            <li>Discoverability</li>
            <li>Cross-round learning</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related articles</h2>
          <div className="space-y-1">
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("dao-grant-milestones")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → DAO grant milestones
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-accountability")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant accountability
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-lifecycle")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → The grant lifecycle
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("why-grant-programs-fail")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Why grant programs fail
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">When Karma is used</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            is used when ecosystems need repeatable funding decisions and durable execution history.
          </p>
        </section>
      </article>
    </main>
  );
}
