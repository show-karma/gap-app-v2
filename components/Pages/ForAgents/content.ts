/**
 * Content for /for-agents — surfaced both as visible UI and as JSON-LD
 * structured data (FAQPage). Co-located with the page sections so the
 * schema and the page never drift apart.
 *
 * The tool catalog is fetched live from gap-indexer's `/v2/mcp/tools`
 * endpoint at request time (1h ISR). `STATIC_FALLBACK_TOOLS` below is the
 * fallback the page renders only when that upstream is down at build or
 * revalidation time.
 */

import type { PublicToolMetadata } from "./types";

export interface AgentFaqEntry {
  question: string;
  answer: string;
}

export interface UseCaseCard {
  title: string;
  description: string;
  example: string;
}

export const AGENT_FAQS: AgentFaqEntry[] = [
  {
    question: "What can a Karma-connected AI agent do?",
    answer:
      "Read projects, grants, milestones, programs, and impact data. With OAuth and your permission, agents can also submit applications, draft updates, comment on reviews, and propose milestone evidence on your behalf.",
  },
  {
    question: "Can the agent take actions in my account?",
    answer:
      "Only the ones you authorize. Karma uses OAuth 2.0 with scoped access tokens; you approve which capabilities the agent gets when you connect, and you can revoke access at any time from your Karma settings.",
  },
  {
    question: "How do I limit what an agent can do?",
    answer:
      "Public reads require no auth. For mutating actions, the agent uses your OAuth token — meaning it inherits exactly the permissions of your Karma account, nothing more. Generate scoped API keys in settings for headless agents that should be even more limited.",
  },
  {
    question: "Where do I see what the agent has done?",
    answer:
      "Every action the agent takes is logged against your account in the same activity history you already use. Applications, comments, and updates are clearly attributed to your account.",
  },
];

export const USE_CASES: UseCaseCard[] = [
  {
    title: "Triage 200 applications in an afternoon",
    description:
      "Have an agent score, summarize, and surface red flags across an entire applicant pool before your review committee meets.",
    example:
      '"Pull all open applications for Optimism Retro Funding Round 5, score them against our public-goods rubric, and surface the ten that need a human reviewer first."',
  },
  {
    title: "Audit milestone delivery across a portfolio",
    description:
      "Ask an agent to flag stalled milestones, summarize completed work, and draft check-in messages to grantees who have gone quiet.",
    example:
      '"List every grant under the Filecoin program with no milestone update in 60+ days and draft a friendly check-in email for each."',
  },
  {
    title: "Discover funding programs for your project",
    description:
      "Let an agent crawl Karma's Funding Map for matching programs, then draft application copy tuned to each one's evaluation criteria.",
    example:
      '"Find every active open-source funding program with a budget over $50k. Sort by application deadline and draft an opening paragraph that matches each program\'s criteria."',
  },
];

/**
 * Fallback only — rendered when the live `/v2/mcp/tools` fetch fails at
 * build or revalidation time. Keep small and representative across the
 * main categories. The full live list comes from the indexer.
 */
export const STATIC_FALLBACK_TOOLS: PublicToolMetadata[] = [
  {
    name: "get_project_details",
    alias: "karma_project_get_details",
    description: "Fetch full metadata, team, links, and grant history for a single project.",
    category: "project",
    requiresAuth: false,
  },
  {
    name: "list_funding_programs",
    alias: "karma_program_list",
    description: "Browse open and historical funding programs across Karma's communities.",
    category: "program",
    requiresAuth: false,
  },
  {
    name: "list_program_applications",
    alias: "karma_application_list",
    description: "Read the applications submitted to a given program.",
    category: "application",
    requiresAuth: false,
  },
  {
    name: "list_project_milestones",
    alias: "karma_milestone_list",
    description: "List milestones for a project, with completion status and evidence links.",
    category: "milestone",
    requiresAuth: false,
  },
  {
    name: "list_grant_payouts",
    alias: "karma_payout_list",
    description: "Track payouts and on-chain disbursements tied to a grant.",
    category: "payout",
    requiresAuth: false,
  },
  {
    name: "search_knowledge_base",
    alias: undefined,
    description: "Search Karma's documentation and grantee guides.",
    category: "knowledge",
    requiresAuth: false,
  },
];
