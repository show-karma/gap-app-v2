import type { Metadata } from "next";
import Link from "next/link";
import {
  getKnowledgeArticleDate,
  getKnowledgeArticleUpdatedDate,
} from "@/app/knowledge/articleDates";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticlePublishedDate } from "@/components/Knowledge/ArticlePublishedDate";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { AI_GRANT_EVALUATION_FAQS } from "./content";

const TITLE = "AI-Assisted Grant Evaluation at Scale";
const DESCRIPTION =
  "How AI-assisted application review works with human sign-off: consistent first-pass scoring, reviewer-only evaluations, and the oversight that keeps grant decisions with people.";

export const metadata: Metadata = customMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PAGES.KNOWLEDGE.ARTICLE("ai-grant-evaluation"),
  ogType: "article",
});

const PUBLISHED_AT = getKnowledgeArticleDate("ai-grant-evaluation");
const UPDATED_AT = getKnowledgeArticleUpdatedDate("ai-grant-evaluation");

export default function AiGrantEvaluationPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Knowledge", href: PAGES.KNOWLEDGE.ROOT },
          {
            label: "AI-Assisted Grant Evaluation",
            href: PAGES.KNOWLEDGE.ARTICLE("ai-grant-evaluation"),
          },
        ]}
      />
      <ArticleJsonLd
        title={TITLE}
        description={DESCRIPTION}
        url={PAGES.KNOWLEDGE.ARTICLE("ai-grant-evaluation")}
        datePublished={PUBLISHED_AT}
        dateModified={UPDATED_AT}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: PAGES.KNOWLEDGE.ROOT },
          {
            name: "AI-Assisted Grant Evaluation",
            url: PAGES.KNOWLEDGE.ARTICLE("ai-grant-evaluation"),
          },
        ]}
      />
      <FAQJsonLd questions={[...AI_GRANT_EVALUATION_FAQS]} />
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">{TITLE}</h1>
          <ArticlePublishedDate date={PUBLISHED_AT} updated={UPDATED_AT} />
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            AI-assisted evaluation gives grant programs a consistent, auditable first pass over
            every application, while approval and rejection stay human decisions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            When programs receive hundreds of applications, fully manual review does not scale:
            reviewer fatigue produces inconsistent scores, missed red flags, and slow decisions.
            AI-assisted evaluation handles the first-pass work (summaries, criteria-based scoring,
            risk signals) while human reviewers keep sign-off on every decision.
          </p>
        </section>

        {AI_GRANT_EVALUATION_FAQS.map((faq) => (
          <section key={faq.question} className="space-y-4">
            <h2 className="text-xl font-semibold">{faq.question}</h2>
            <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
          </section>
        ))}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What it does not replace</h2>
          <p className="text-gray-700 dark:text-gray-300">
            AI does not replace human judgment. Final decisions, nuanced evaluation, and
            context-sensitive assessments remain with reviewers, and on Karma that is enforced in
            the platform, not just recommended: evaluation failures never block a submission, and no
            evaluation outcome moves an application forward or backward on its own.
          </p>
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
              href={PAGES.KNOWLEDGE.ARTICLE("dao-grant-milestones")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → DAO grant milestones
            </Link>
            <Link
              href={PAGES.KNOWLEDGE.ARTICLE("why-grant-programs-fail")}
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Why grant programs fail
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
            builds AI-assisted evaluation into the grant workflow: programs define their own
            evaluation criteria, evaluations run automatically on submission, and reviewers keep
            sign-off on every status change.
          </p>
        </section>
      </article>
    </main>
  );
}
