import type { Metadata } from "next";
import Link from "next/link";
import { ResearchIndexExperience } from "@/src/features/donor-research/components/common/ResearchIndexExperience";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

// Rendered as "Nonprofit Research & Due Diligence for Donor Advisors | Karma"
// by the root layout's `%s | Karma` title template.
const PAGE_TITLE = "Nonprofit Research & Due Diligence for Donor Advisors";

export const metadata: Metadata = customMetadata({
  title: PAGE_TITLE,
  description:
    "Ranked, compliance-checked nonprofit shortlists for donor advisors: IRS Pub 78 status, Form 990 recency, California AG registry, and governance signals, built from over 2 million IRS filings.",
  path: "/nonprofit-research",
});

export default function Page() {
  return (
    <>
      {/* Signed-in advisors get the workspace exactly as before; signed-out
          visitors get the sign-in gate. The short intro below is the page's
          server-rendered content; the full diligence Q&A lives in the
          knowledge base at /knowledge/nonprofit-due-diligence. */}
      <ResearchIndexExperience />
      <section className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-sm text-muted-foreground">
          Karma Nonprofit Research builds ranked, compliance-checked nonprofit shortlists for donor
          advisors, verifying IRS Publication 78 status, Form 990 recency, California AG registry
          status, and governance signals across more than 2 million IRS filings. For how the checks
          and rankings work, read the knowledge-base guide to{" "}
          <Link
            href={PAGES.KNOWLEDGE.ARTICLE("nonprofit-due-diligence")}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            nonprofit due diligence for donor advisors
          </Link>
          .
        </p>
      </section>
    </>
  );
}
