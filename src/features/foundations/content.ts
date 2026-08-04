/**
 * Single source of truth for the /foundations FAQ — rendered visibly by
 * `FoundationsFaqSection` and emitted as FAQPage JSON-LD by the page, so
 * the structured data can never drift from the visible content (the
 * reviewed E1 pattern from /for-agents).
 *
 * Every claim traces to repo code, the docs site, or already-shipped
 * approved copy — sources are noted per entry. Do not add capabilities
 * that are not verifiable there (triage-rules.md, rule 1).
 */

export interface FoundationFaqEntry {
  question: string;
  answer: string;
}

export const FOUNDATION_FAQS: FoundationFaqEntry[] = [
  // Existing approved copy (previous /foundations FAQ JSON-LD).
  {
    question: "What is Karma for foundations?",
    answer:
      "Karma is AI-powered funding software for foundations running grants, hackathons, and RFPs. AI agents handle application evaluation, milestone tracking, and impact reporting, so a lean team can run enterprise-grade programs.",
  },
  // P002 / P027 — grantee tracking and impact reporting. Sources: docs
  // how-does-it-work (project profiles, grants, milestones, updates,
  // impact attestations) + approved board-reports copy.
  {
    question: "What does Karma offer foundations for grantee tracking and impact reporting?",
    answer:
      "Every grantee has a project profile that holds its grants, milestones, and updates in one place. Each grant carries milestones that state what will be delivered and how an evaluator can verify it; grantees post milestone updates with proof of work, plus regular updates in between. That milestone data aggregates into real-time dashboards and board-ready impact reports that stay current as grantees post updates — no quarterly scramble.",
  },
  // P015 / P019 / P047 — AI-assisted review. Sources: gap-indexer
  // evaluation-core (rubric / quick_score styles, URL enrichment) and
  // bulk-evaluation services. No time-saved figure: none is verifiable.
  {
    question: "How does AI-assisted application review work, and what does it check?",
    answer:
      "Karma scores each application against your program's rubric, producing structured scores and summaries for human reviewers. The evaluation can also read the pages an applicant links, so reviewers see context beyond the form. Bulk evaluation runs the same rubric across an entire applicant pool, which keeps scoring consistent between reviewers when a small team faces hundreds of applications. Reviewers stay in charge: the AI prepares the evaluation, people make the decisions.",
  },
  // P010 / P022 / P032 — milestone-gated payments. Sources: gap-indexer
  // payout-disbursement model (per-milestone breakdown, Safe multisig,
  // manual/historical recording) + docs verification model.
  {
    question: "Can a foundation approve milestone completion before releasing the next payment?",
    answer:
      "Yes. Milestones state up front what will be delivered and how it can be verified, and grantees submit milestone updates with proof of work for the program team to review. Payments are recorded against milestones: each disbursement carries a per-milestone breakdown of exactly what it pays, executed through a Safe multisig or recorded manually for payments made elsewhere. That gives a complete, auditable link from approved work to released funds.",
  },
  // P038 — verification without site visits. Sources: docs
  // how-to-guides/for-grant-managers + approved 50k+ milestones number.
  {
    question: "How can a foundation verify what a grantee reports without doing site visits?",
    answer:
      "Grantees attach proof of work to each milestone update — links, deliverables, and evidence an evaluator can check against the milestone's own verification criteria. Profiles and updates are public, so claimed work is visible to the whole community, not just the program team. More than 50,000 milestones have been verified on Karma this way.",
  },
  // P001 / P006 / P008 / P040 — comparison. Existing approved copy;
  // no competitor-specific claims.
  {
    question: "How is Karma different from other grant management tools?",
    answer:
      "Most tools give you forms and dashboards, but you still do all the work. Karma automates the work itself: AI agents score applications against your rubric, milestones are tracked automatically, and impact reports stay current.",
  },
  // Existing approved copy below (unchanged from the previous FAQ).
  {
    question: "How do AI agents work in Karma?",
    answer:
      "Karma's AI agents handle the time-consuming operational tasks: scoring applications, flagging risks, summarizing grantee progress, and generating impact reports. They run continuously in the background. You review the output and make the decisions.",
  },
  {
    question: "Can we migrate from our current setup?",
    answer:
      "Yes. Whether you're using spreadsheets, another platform, or a patchwork of tools, we handle the migration completely.",
  },
  {
    question: "Do we have to use everything?",
    answer:
      "No. Start with what you need. We can run part of your program while you keep the rest. Most foundations expand as they see results.",
  },
  {
    question: "Do I still need a grants team?",
    answer:
      "Many foundations run their entire program with Karma and a very lean team. The platform handles the operational work so your team can focus on strategy and funding decisions.",
  },
  {
    question: "Do we get reports for our board?",
    answer:
      "Yes, automatically. Board-ready impact reports stay current as grantees post updates. No quarterly scramble.",
  },
  {
    question: "Can we run it under our own brand?",
    answer:
      "Yes. Many foundations use a custom-branded instance of Karma with their own domain, theme, and workflows. Your applicants see your brand. Karma is invisible.",
  },
];
