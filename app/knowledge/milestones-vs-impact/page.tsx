import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Grant Milestones vs Impact",
  description:
    "Milestones track work done while impact tracks change created. Learn why separating these concepts is critical for honest evaluation of funded projects.",
  path: "/knowledge/milestones-vs-impact",
  ogType: "article",
});

export default function MilestonesVsImpactPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: "/knowledge" },
          { label: "Milestones vs Impact", href: "/knowledge/milestones-vs-impact" },
        ]}
      />
      <ArticleJsonLd
        title="Grant Milestones vs Impact"
        description="Milestones track work done while impact tracks change created. Learn why separating these concepts is critical for honest evaluation of funded projects."
        url="/knowledge/milestones-vs-impact"
        datePublished="2025-01-15"
        dateModified="2026-03-24"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: "/knowledge" },
          { name: "Milestones vs Impact", url: "/knowledge/milestones-vs-impact" },
        ]}
      />
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">Grant Milestones vs Impact</h1>

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
              href="/knowledge/impact-measurement"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Impact measurement
            </Link>
            <Link
              href="/knowledge/impact-verification"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Impact verification
            </Link>
            <Link
              href="/knowledge/dao-grant-milestones"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → DAO grant milestones
            </Link>
            <Link
              href="/knowledge/grant-lifecycle"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → The grant lifecycle
            </Link>
            <Link
              href="/knowledge/grant-accountability"
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
              href="https://www.karmahq.xyz"
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
