import type { Metadata } from "next";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { LandingPageClient } from "@/src/features/non-profits/components/landing-page-client";
import { FIND_FUNDERS_FAQS } from "@/src/features/non-profits/lib/faq-content";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Karma Find Funders — AI Agents for Funder Research",
  description:
    "Ask an agent: find foundations and grantmaking nonprofits aligned to your mission. Grounded in every IRS 990 on record — every answer cited. Works in Claude and ChatGPT.",
  path: "/nonprofits/find-funders",
});

/**
 * Rendered on the server, deliberately.
 *
 * This route used to render the landing page through a `dynamic(..., { ssr:
 * false })` wrapper, which meant a crawler that does not execute JavaScript
 * received only the section navbar and footer — no <h1>, no hero copy, none of
 * the eight content sections (DEV-586). Nothing in `LandingPageClient` blocks
 * SSR: every `document` / `sessionStorage` / `IntersectionObserver` touch lives
 * in an effect or an event handler, and the search-session store's `persist`
 * middleware no-ops on the server.
 *
 * Everything this page renders still streams behind the segment's loading.tsx
 * Suspense boundary as a hidden chunk — which is why that loading.tsx is a
 * static replica of the hero rather than a spinner: the fallback is the part
 * of this route a no-JS reader actually sees. See ./loading.tsx.
 */
export default function NonProfitsPage() {
  return (
    <>
      {/* Fed from the same array as the visible FAQ section (and the root
          layout's noscript replica), so the structured data never claims
          something a reader cannot see. */}
      <FAQJsonLd questions={FIND_FUNDERS_FAQS} />
      <LandingPageClient />
    </>
  );
}
