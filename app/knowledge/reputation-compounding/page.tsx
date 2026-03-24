import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata } from "@/utilities/meta";

const title = "How Reputation Compounds in Open Funding Systems";
const description =
  "Why reputation acts as cumulative memory in open funding, reducing uncertainty and improving capital allocation. Learn how compounding credibility works.";

export const metadata: Metadata = customMetadata({
  title,
  description,
  path: "/knowledge/reputation-compounding",
  ogType: "article",
});

export default function ReputationCompoundingPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: "/knowledge" },
          { label: "Reputation Compounding", href: "/knowledge/reputation-compounding" },
        ]}
      />
      <ArticleJsonLd
        title={title}
        description={description}
        url="/knowledge/reputation-compounding"
        datePublished="2025-01-15"
        dateModified="2026-03-24"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: "/knowledge" },
          { name: "Reputation Compounding", url: "/knowledge/reputation-compounding" },
        ]}
      />
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">How Reputation Compounds in Open Funding Systems</h1>

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
              href="/knowledge/onchain-reputation"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → What is onchain reputation?
            </Link>
            <Link
              href="/knowledge/project-reputation"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → How projects build reputation through funding
            </Link>
            <Link
              href="/knowledge/project-updates-and-reputation"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Project updates and reputation
            </Link>
            <Link
              href="/knowledge/impact-measurement"
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
              href="https://www.karmahq.xyz"
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
