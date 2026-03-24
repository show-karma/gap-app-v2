import type { Metadata } from "next";
import Link from "next/link";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata } from "@/utilities/meta";

const title = "How Funders Use Project Profiles to Evaluate Work";
const description =
  "How funders evaluate projects based on execution history, not just proposals. Learn what funders look for in project profiles and how profiles outperform applications.";

export const metadata: Metadata = customMetadata({
  title,
  description,
  path: "/knowledge/how-funders-use-project-profiles",
});

export default function HowFundersUseProjectProfilesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <ArticleJsonLd
        title={title}
        description={description}
        url="/knowledge/how-funders-use-project-profiles"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Knowledge", url: "/knowledge" },
          {
            name: "How Funders Use Project Profiles",
            url: "/knowledge/how-funders-use-project-profiles",
          },
        ]}
      />
      <article className="space-y-8">
        <h1 className="text-3xl font-bold">How Funders Use Project Profiles to Evaluate Work</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In one sentence</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Funders use project profiles to reduce uncertainty and see execution history at a
            glance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Short answer</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Project profiles allow funders to evaluate projects based on real progress, not just
            proposals.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What funders look for</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Consistent updates</li>
            <li>Evidence of execution</li>
            <li>Follow-through on milestones</li>
            <li>Transparency about challenges</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Why profiles outperform applications</h2>
          <p className="text-gray-700 dark:text-gray-300">Applications predict intent.</p>
          <p className="text-gray-700 dark:text-gray-300">Profiles reveal behavior.</p>
          <p className="text-gray-700 dark:text-gray-300">
            Over time, funders prefer projects that maintain strong profiles.
          </p>
          <p className="text-gray-700 dark:text-gray-300">This creates a norm:</p>
          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:border-gray-600 dark:text-gray-400">
            If you want funding, maintain a project profile.
          </blockquote>
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
            provides project profiles that give funders the execution history they need to make
            better funding decisions.
          </p>
          <p className="pt-2">
            <Link
              href="/create-project-profile"
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
              href="/knowledge/project-profiles"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → What are project profiles?
            </Link>
            <Link
              href="/knowledge/onchain-reputation"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → What is onchain reputation?
            </Link>
            <Link
              href="/knowledge/grant-accountability"
              className="block text-blue-600 hover:underline dark:text-blue-400"
            >
              → Grant accountability
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
