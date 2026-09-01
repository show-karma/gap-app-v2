/**
 * Single source of truth for the /knowledge/nonprofit-due-diligence Q&A.
 * The article renders every entry visibly and emits the same entries as
 * FAQPage JSON-LD, so the structured data can never drift from the
 * visible content (the reviewed E1 pattern from /for-agents).
 *
 * Every claim traces to gap-indexer donor-research code or approved
 * shipped copy; sources are noted per entry. The compliance wording is
 * deliberately precise: the state-registry check is the California
 * Attorney General charity registry, applicable to California
 * organizations, not an all-state registration check
 * (compliance-checks.ts). Do not broaden it.
 */

export interface ResearchFaqEntry {
  question: string;
  answer: string;
}

export const RESEARCH_FAQS: ResearchFaqEntry[] = [
  // P012-adjacent framing + audience.
  {
    question: "What is Karma Nonprofit Research?",
    answer:
      "Karma Nonprofit Research is a due-diligence and shortlisting tool for donor advisors at community foundations, DAF sponsors, and family offices. An advisor describes a donor's giving criteria and gets back a ranked, compliance-checked shortlist of nonprofits with cited evidence, built from IRS 990 and 990-PF filings: over 2 million filings and $1.2T in tracked grantmaking dollars.",
  },
  // P004: exactly what is checked. Source: gap-indexer
  // compliance-checks.ts (pub78 / recent_990 / ca_ag / governance).
  {
    question: "Does Karma check IRS Pub 78, Form 990 recency, and state charity registration?",
    answer:
      "Karma runs four compliance checks on every candidate: IRS Publication 78 status (listed as an active 501(c)(3), with a 990-freshness proxy when the Pub 78 flag is not indexed); Form 990 recency (most recent 990 filed within the last three years); the California Attorney General charity registry for California organizations (the one state registry checked today); and governance signals from the 990, including board size and related-party disclosures. Each check reports passed, failed, not applicable, or unknown, with a one-line piece of evidence, such as which year the latest 990 was filed.",
  },
  // P003 / P042: ranked shortlist. Sources: research-criteria repository
  // (cause / geography / amountMin / amountMax) + composite-weights value
  // object (five advisor-configurable dimensions).
  {
    question:
      "Can Karma build a ranked nonprofit shortlist filtered by cause area, geography, and gift size?",
    answer:
      "Yes. An advisor records the donor's criteria (cause, geography, and a gift-size range), and Karma assembles a candidate pool and ranks it with a weighted composite score across five dimensions: match with the donor's criteria, compliance status, impact recency, online presence, and social presence. Advisors can adjust the weight of each dimension per report, so a compliance-first donor and an impact-first donor get differently ranked shortlists from the same pool.",
  },
  // P024: legitimacy / good standing. Source: compliance verdict service
  // + evidence lines in compliance-checks.ts.
  {
    question:
      "How do I verify a nonprofit is legitimate and in good standing before recommending a grant?",
    answer:
      "Every shortlisted nonprofit carries a compliance verdict backed by the four checks above, each with its evidence stated: its IRS Publication 78 status, when its most recent Form 990 was filed, its California AG registry status where applicable, and governance signals from the filing. Failed checks and their reasons are shown rather than silently filtering the organization out, so the advisor sees why a candidate was disqualified.",
  },
  // P034: activity when the 990 is old. Sources: composite dimensions
  // (onlinePresence / socialPresence / impactRecency), activity-ingestion
  // and social-signal services.
  {
    question: "How can I tell if a nonprofit is still active when its latest Form 990 is old?",
    answer:
      "Filings lag reality, so Karma pairs filing recency with live activity signals: the organization's online presence (its website), its social presence, and how recently it has shown impact. An organization with an older 990 but an active site and recent activity reads differently from one that has gone quiet everywhere, and both facts are visible to the advisor rather than collapsed into a single score.",
  },
  // P017 / P021-adjacent workflow. Sources: donor personas (donor-handle),
  // diligence-template/request/response repos (DEV-428), shared-report
  // token routes.
  {
    question: "How does the advisor workflow go from a long list to a recommendation?",
    answer:
      "An advisor sets up a donor persona with the donor's criteria, runs a research report to get the ranked shortlist, and reviews candidates with their compliance evidence. From there, Karma supports sending a diligence questionnaire to a nonprofit from the advisor's own template and collecting the responses, and sharing the finished report with the donor through a private link where the donor can read and comment.",
  },
  // P009 / P041: comparison. Positioning only; no claims about
  // competitors' products.
  {
    question: "How does Karma compare to Candid, GuideStar, or Charity Navigator for vetting?",
    answer:
      "Karma Nonprofit Research is built for the shortlist-and-recommend workflow rather than one-at-a-time lookups: instead of searching organizations individually, an advisor describes the donor's criteria once and receives a ranked, compliance-checked shortlist with the evidence for each check stated inline, ready to share with the donor. It draws on the same public record of IRS 990 and 990-PF filings, plus live activity signals.",
  },
  // Access. Source: sign-in gate + advisor-scoped services.
  {
    question: "Who can use Karma Nonprofit Research?",
    answer:
      "The research workspace is for donor advisors and requires signing in, because reports, personas, and diligence requests are private to the advisor who created them. Donors access shared reports through a private link from their advisor without needing an account.",
  },
];
