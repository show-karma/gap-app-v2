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
  title: "Grant Fund Disbursement Coordination",
  description:
    "Learn how grant payments are safely triggered once KYC, signing, and approvals are complete. Explore best practices for coordinating fund disbursement at scale.",
  path: PAGES.KNOWLEDGE.ARTICLE("grant-fund-disbursement"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("grant-fund-disbursement");

export default function GrantFundDisbursementPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          { label: "Fund Disbursement", href: PAGES.KNOWLEDGE.ARTICLE("grant-fund-disbursement") },
        ]}
      />
      <ArticleJsonLd
        title="Grant Fund Disbursement Coordination"
        description="Learn how grant payments are safely triggered once KYC, signing, and approvals are complete. Explore best practices for coordinating fund disbursement at scale."
        url={PAGES.KNOWLEDGE.ARTICLE("grant-fund-disbursement")}
        datePublished={PUBLISHED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          { name: "Fund Disbursement", url: PAGES.KNOWLEDGE.ARTICLE("grant-fund-disbursement") },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Grant Fund Disbursement Coordination</h1>
          <ArticlePublishedDate date={PUBLISHED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Grant disbursement requires coordinating compliance, approvals, and execution before
            funds move.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Fund disbursement is the operational step where grants move from approval to payment,
            often gated by KYC, signed documents, and milestone conditions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why disbursement is complex</h2>
          <p className="text-gray-700 dark:text-gray-300">Disbursement often depends on:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Completed KYC</li>
            <li>Signed agreements</li>
            <li>Internal approvals</li>
            <li>Correct transaction execution</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            Each dependency introduces delays if tracked manually.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What good disbursement systems do</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Surface blocking requirements</li>
            <li>Prevent premature payments</li>
            <li>Reduce manual coordination</li>
            <li>Create auditability</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related articles</h2>
          <div className="space-y-1">
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-kyc")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → KYC in grant programs
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-lifecycle")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → The grant lifecycle
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("grant-document-signing")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Document signing in grants
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
            coordinates KYC, signing, and grant status so program managers can confidently trigger
            payments without operational chaos.
          </p>
        </section>
      </article>
    </main>
  );
}
