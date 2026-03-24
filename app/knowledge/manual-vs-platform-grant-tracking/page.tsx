import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Manual vs Platform-Based Grant Tracking",
  description:
    "Compare spreadsheets and documents with dedicated funding platforms for grant tracking. Learn when manual tools break down and when structured platforms scale better.",
  path: "/knowledge/manual-vs-platform-grant-tracking",
  ogType: "article",
});

export default function ManualVsPlatformGrantTrackingPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: "/knowledge" },
          {
            label: "Manual vs Platform Grant Tracking",
            href: "/knowledge/manual-vs-platform-grant-tracking",
          },
        ]}
      />
      <ArticleJsonLd
        title="Manual vs Platform-Based Grant Tracking"
        description="Compare spreadsheets and documents with dedicated funding platforms for grant tracking. Learn when manual tools break down and when structured platforms scale better."
        url="/knowledge/manual-vs-platform-grant-tracking"
        datePublished="2025-01-15"
        dateModified="2026-03-24"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: "/knowledge" },
          {
            name: "Manual vs Platform Grant Tracking",
            url: "/knowledge/manual-vs-platform-grant-tracking",
          },
        ]}
      />
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Manual vs Platform-Based Grant Tracking</h1>

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
              href="/knowledge/dao-grant-milestones"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → DAO grant milestones
            </Link>
            <Link
              href="/knowledge/grant-accountability"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant accountability
            </Link>
            <Link
              href="/knowledge/grant-lifecycle"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → The grant lifecycle
            </Link>
            <Link
              href="/knowledge/why-grant-programs-fail"
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
              href="https://www.karmahq.xyz"
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
