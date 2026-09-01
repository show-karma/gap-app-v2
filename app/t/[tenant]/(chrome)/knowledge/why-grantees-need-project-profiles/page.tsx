import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticlePublishedDate } from "@/components/Knowledge/ArticlePublishedDate";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata, SITE_URL } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { getKnowledgeArticleDate } from "../articleDates";

const title = "Why Grantees Need Project Profiles";
const description =
  "Project profiles help grantees show funders what happens after funding, build lasting credibility, and avoid repetitive reporting across grant programs.";

export const metadata: Metadata = customMetadata({
  title,
  description,
  path: PAGES.KNOWLEDGE.ARTICLE("why-grantees-need-project-profiles"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("why-grantees-need-project-profiles");

export default function WhyGranteesNeedProjectProfilesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          {
            label: "Why Grantees Need Project Profiles",
            href: PAGES.KNOWLEDGE.ARTICLE("why-grantees-need-project-profiles"),
          },
        ]}
      />
      <ArticleJsonLd
        title={title}
        description={description}
        url={PAGES.KNOWLEDGE.ARTICLE("why-grantees-need-project-profiles")}
        datePublished={PUBLISHED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          {
            name: "Why Grantees Need Project Profiles",
            url: PAGES.KNOWLEDGE.ARTICLE("why-grantees-need-project-profiles"),
          },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Why Grantees Need Project Profiles</h1>
          <ArticlePublishedDate date={PUBLISHED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Grantees need project profiles to show funders what actually happens after funding.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            A project profile allows grantees to document progress, share updates, and build trust
            continuously instead of relying on one-off reports.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">The problem with traditional reporting</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Reports are private</li>
            <li>Reports are static</li>
            <li>Reports are forgotten</li>
            <li>Each funder asks for something different</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300">
            This creates duplicated work with little long-term benefit.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What profiles change</h2>
          <p className="text-gray-700 dark:text-gray-300">With a project profile:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Updates are written once</li>
            <li>Visibility compounds</li>
            <li>Future funders see history</li>
            <li>Accountability is proactive</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters for small grants</h2>
          <p className="text-gray-700 dark:text-gray-300">
            For grantees receiving funding from programs like Artizen or small foundations,
            visibility matters as much as the funding itself.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            A profile turns small grants into <strong>credibility signals</strong>, not just line
            items.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How Karma fits</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            provides free project profiles where grantees can document their work once and share it
            everywhere.
          </p>
          <p className="pt-2">
            <Link
              href={PAGES.CREATE_PROJECT_PROFILE}
              className="text-blue-600 hover:underline dark:text-blue-400 font-semibold"
            >
              → Create your project profile
            </Link>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related articles</h2>
          <div className="space-y-1">
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("project-profiles")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → What are project profiles?
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("project-profiles-as-resumes")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Project profiles as resumes for funded work
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
