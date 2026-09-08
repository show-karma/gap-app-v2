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
          visitors get the sign-in gate. The one-liner below is deliberately
          footnote-sized (reviewer call); the full diligence Q&A lives in the
          knowledge base at /knowledge/nonprofit-due-diligence. */}
      {/* Server-render exactly one <h1> for SEO without disturbing the visual
          design (the project-layout sr-only pattern): the workspace and the
          sign-in gate render their own visible headings client-side. */}
      <h1 className="sr-only">Nonprofit research for donor advisors</h1>
      <ResearchIndexExperience />
      <p className="mx-auto w-full max-w-3xl px-4 py-3 text-center text-xs text-muted-foreground">
        For how the compliance checks and shortlist rankings work, read the knowledge-base guide to{" "}
        <Link
          href={PAGES.KNOWLEDGE.ARTICLE("nonprofit-due-diligence")}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          nonprofit due diligence for donor advisors
        </Link>
        .
      </p>
    </>
  );
}
