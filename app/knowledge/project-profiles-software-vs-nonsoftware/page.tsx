import type { Metadata } from "next";
import Link from "next/link";
import { getKnowledgeArticleDate } from "@/app/knowledge/articleDates";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticlePublishedDate } from "@/components/Knowledge/ArticlePublishedDate";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

const title = "Project Profiles for Software vs Non-Software Projects";
const description =
  "Project profiles work for both technical and non-technical work. Learn how software and non-software projects document progress and build credibility differently.";

export const metadata: Metadata = customMetadata({
  title,
  description,
  path: PAGES.KNOWLEDGE.ARTICLE("project-profiles-software-vs-nonsoftware"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("project-profiles-software-vs-nonsoftware");

export default function ProjectProfilesSoftwareVsNonsoftwarePage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          {
            label: "Software vs Non-Software Profiles",
            href: PAGES.KNOWLEDGE.ARTICLE("project-profiles-software-vs-nonsoftware"),
          },
        ]}
      />
      <ArticleJsonLd
        title={title}
        description={description}
        url={PAGES.KNOWLEDGE.ARTICLE("project-profiles-software-vs-nonsoftware")}
        datePublished={PUBLISHED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          {
            name: "Software vs Non-Software Profiles",
            url: PAGES.KNOWLEDGE.ARTICLE("project-profiles-software-vs-nonsoftware"),
          },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">
            Project Profiles for Software vs Non-Software Projects
          </h1>
          <ArticlePublishedDate date={PUBLISHED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            The same project profile works for software and non-software projects — only the
            evidence differs.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles adapt to different project types by allowing different forms of proof
            while preserving a common structure.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Software projects</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>GitHub repositories</li>
            <li>Commit and release activity</li>
            <li>Smart contract addresses</li>
            <li>Onchain usage metrics</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Non-software projects</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Impact metrics</li>
            <li>Outputs and outcomes</li>
            <li>Qualitative evidence</li>
            <li>Community reports</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why this matters</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Nonprofits and philanthropic projects often lack a shared place to show progress.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles create parity between technical and non-technical work.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How Karma fits</h2>
          <p className="text-gray-700 dark:text-gray-300">
            <a
              href="https://www.karmahq.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Karma
            </a>{" "}
            provides project profiles that work for both software and non-software projects,
            allowing any type of evidence to build credibility.
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
              href={PAGES.KNOWLEDGE.ARTICLE("onchain-project-profiles")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Onchain project profiles explained
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
