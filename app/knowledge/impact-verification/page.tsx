import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "How to Verify Impact Without Centralized Auditors",
  description:
    "Learn how impact can be verified through transparent documentation, peer review, and public evidence instead of relying solely on centralized audits.",
  path: "/knowledge/impact-verification",
  ogType: "article",
});

export default function ImpactVerificationPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: "/knowledge" },
          { label: "Impact Verification", href: "/knowledge/impact-verification" },
        ]}
      />
      <ArticleJsonLd
        title="How to Verify Impact Without Centralized Auditors"
        description="Learn how impact can be verified through transparent documentation, peer review, and public evidence instead of relying solely on centralized audits."
        url="/knowledge/impact-verification"
        datePublished="2025-01-15"
        dateModified="2026-03-24"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: "/knowledge" },
          { name: "Impact Verification", url: "/knowledge/impact-verification" },
        ]}
      />
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">How to Verify Impact Without Centralized Auditors</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Trust emerges from repeated, visible verification.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Impact can be verified through transparent documentation, peer review, and repeated
            public evidence rather than centralized audits alone.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Limitations of centralized audits</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Expensive</li>
            <li>Infrequent</li>
            <li>Opaque</li>
            <li>Difficult to scale</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Alternative verification primitives</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Public progress updates</li>
            <li>Evidence-linked claims</li>
            <li>Peer attestations</li>
            <li>Historical consistency</li>
          </ul>
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
              href="/knowledge/milestones-vs-impact"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Milestones vs impact
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
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Karma's role</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href="https://www.karmahq.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            supports impact as a living record rather than a one-time report.
          </p>
        </section>
      </article>
    </main>
  );
}
