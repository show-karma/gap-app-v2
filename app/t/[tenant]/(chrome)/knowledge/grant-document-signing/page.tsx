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
  title: "Document Signing in Grant Programs",
  description:
    "Understand why grant agreements must be tracked as part of the funding workflow. Learn how integrated document signing prevents operational chaos and payment delays.",
  path: PAGES.KNOWLEDGE.ARTICLE("grant-document-signing"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("grant-document-signing");

export default function GrantDocumentSigningPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          { label: "Document Signing", href: PAGES.KNOWLEDGE.ARTICLE("grant-document-signing") },
        ]}
      />
      <ArticleJsonLd
        title="Document Signing in Grant Programs"
        description="Understand why grant agreements must be tracked as part of the funding workflow. Learn how integrated document signing prevents operational chaos and payment delays."
        url={PAGES.KNOWLEDGE.ARTICLE("grant-document-signing")}
        datePublished={PUBLISHED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          { name: "Document Signing", url: PAGES.KNOWLEDGE.ARTICLE("grant-document-signing") },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Document Signing in Grant Programs</h1>
          <ArticlePublishedDate date={PUBLISHED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Document signing formalizes grant commitments and must be tracked as part of the funding
            workflow.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Many programs require signed agreements defining milestones, payment conditions, and
            legal obligations. Signing must be tied directly to grant status to prevent operational
            chaos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What agreements typically define</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Scope of work and milestones</li>
            <li>Payment conditions and schedule</li>
            <li>Legal and reporting obligations</li>
            <li>Termination clauses</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Problems without integrated signing</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Documents fragment across inboxes</li>
            <li>Signature status becomes unclear</li>
            <li>Payments stall waiting for confirmations</li>
            <li>No audit trail for agreements</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related articles</h2>
          <div className="space-y-1">
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
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-kyc")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → KYC in grant programs
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-fund-disbursement")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant fund disbursement
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Karma's role</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            integrates document signing into the grant workflow so signature status is always
            visible and tied to disbursement readiness.
          </p>
        </section>
      </article>
    </main>
  );
}
