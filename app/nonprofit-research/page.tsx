import type { Metadata } from "next";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { ResearchFaqSection } from "@/src/features/donor-research/components/common/ResearchFaqSection";
import { ResearchIndexExperience } from "@/src/features/donor-research/components/common/ResearchIndexExperience";
import { RESEARCH_FAQS } from "@/src/features/donor-research/content";
import { customMetadata } from "@/utilities/meta";

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
      <FAQJsonLd questions={RESEARCH_FAQS} />
      {/* Signed-in advisors get the workspace exactly as before; signed-out
          visitors get the sign-in gate with the public answer content below
          it. The FAQ is a server component, so it is in the server HTML —
          the workspace itself is client-only and never was. */}
      <ResearchIndexExperience />
      <ResearchFaqSection />
    </>
  );
}
