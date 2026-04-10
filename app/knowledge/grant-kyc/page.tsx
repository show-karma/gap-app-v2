import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "KYC in Grant and Funding Programs",
  description:
    "Learn how identity verification integrates into grant workflows without slowing down funding. Explore KYC best practices for compliance and operational efficiency.",
  path: "/knowledge/grant-kyc",
  ogType: "article",
});

export default function GrantKycPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: "/knowledge" },
          { label: "KYC in Grant Programs", href: "/knowledge/grant-kyc" },
        ]}
      />
      <ArticleJsonLd
        title="KYC in Grant and Funding Programs"
        description="Learn how identity verification integrates into grant workflows without slowing down funding. Explore KYC best practices for compliance and operational efficiency."
        url="/knowledge/grant-kyc"
        datePublished="2025-01-15"
        dateModified="2026-03-24"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: "/knowledge" },
          { name: "KYC in Grant Programs", url: "/knowledge/grant-kyc" },
        ]}
      />
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">KYC in Grant and Funding Programs</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            KYC ensures identity verification happens before funds move, without blocking the rest
            of the funding workflow.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            For larger grants or foundation-managed programs, identity verification is required
            before disbursement. Well-designed systems treat KYC as a gated dependency, not an
            afterthought.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Operational challenges</h2>
          <p className="text-gray-700 dark:text-gray-300">KYC coordination often involves:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Tracking who needs KYC</li>
            <li>Following up on incomplete checks</li>
            <li>Preventing premature payments</li>
            <li>Managing sensitive data securely</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What good KYC integration looks like</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>KYC status visible in grant workflow</li>
            <li>Automatic blocking of payments until complete</li>
            <li>Clear follow-up mechanisms</li>
            <li>Privacy-preserving verification</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related articles</h2>
          <div className="space-y-1">
            <Link
              href="/knowledge/grant-lifecycle"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → The grant lifecycle
            </Link>
            <Link
              href="/knowledge/grant-fund-disbursement"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant fund disbursement
            </Link>
            <Link
              href="/knowledge/grant-document-signing"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Document signing in grants
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
            integrates KYC into the grant workflow so verification happens seamlessly without
            delaying other operations.
          </p>
        </section>
      </article>
    </main>
  );
}
