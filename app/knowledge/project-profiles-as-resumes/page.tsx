import type { Metadata } from "next";
import Link from "next/link";
import { getKnowledgeArticleDate } from "@/app/knowledge/articleDates";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticlePublishedDate } from "@/components/Knowledge/ArticlePublishedDate";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata, SITE_URL } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

const title = "Project Profiles as a Global Resume for Funded Work";
const description =
  "Project profiles serve as global resumes for funded work, giving teams a portable, verifiable track record that funders can trust across programs.";

export const metadata: Metadata = customMetadata({
  title,
  description,
  path: PAGES.KNOWLEDGE.ARTICLE("project-profiles-as-resumes"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("project-profiles-as-resumes");

export default function ProjectProfilesAsResumesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          {
            label: "Project Profiles as Resumes",
            href: PAGES.KNOWLEDGE.ARTICLE("project-profiles-as-resumes"),
          },
        ]}
      />
      <ArticleJsonLd
        title={title}
        description={description}
        url={PAGES.KNOWLEDGE.ARTICLE("project-profiles-as-resumes")}
        datePublished={PUBLISHED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          {
            name: "Project Profiles as Resumes",
            url: PAGES.KNOWLEDGE.ARTICLE("project-profiles-as-resumes"),
          },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">
            Project Profiles as a Global Resume for Funded Work
          </h1>
          <ArticlePublishedDate date={PUBLISHED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            A project profile is a resume for funded work.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles play the same role for projects that resumes play for individuals: they
            show experience, outcomes, and reliability over time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Useful comparison</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>LinkedIn → who you are</li>
            <li>GitHub → what you code</li>
            <li>Grant reports → what you claimed</li>
            <li>
              <strong>Project profiles → what your project has actually delivered</strong>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Funders rarely have context across grants and programs.
          </p>
          <p className="text-gray-700 dark:text-gray-300">A project profile becomes:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>A single source of truth</li>
            <li>A credibility anchor</li>
            <li>A reusable asset</li>
          </ul>
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
            provides project profiles as the global resume for funded work — a single place to show
            what your project has delivered.
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
              href={PAGES.KNOWLEDGE.ARTICLE("why-grantees-need-project-profiles")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Why grantees need project profiles
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
