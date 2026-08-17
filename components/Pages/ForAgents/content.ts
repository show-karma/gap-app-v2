/**
 * Content for /for-agents — surfaced both as visible UI and as JSON-LD
 * structured data (FAQPage). Co-located with the page sections so the
 * schema and the page never drift apart.
 *
 * The tool catalog is fetched live from gap-indexer's `/mcp/tools`
 * endpoint at request time (1h ISR). `STATIC_FALLBACK_TOOLS` below is the
 * fallback the page renders only when that upstream is down at build or
 * revalidation time.
 */

import { CANONICAL_HOST } from "@/utilities/domains";
import { envVars } from "@/utilities/enviromentVars";
import { normalizeBaseUrl } from "@/utilities/wellKnown";
import type { PublicToolMetadata } from "./types";

/**
 * Derived, never hardcoded. These strings are the setup instructions users
 * copy into their MCP client and are also emitted as FAQPage JSON-LD, so a
 * stale literal here contradicts /mcp/connect and gets ingested by crawlers
 * as the official endpoint. Built the same way McpConnectPage builds it.
 */
const MCP_SERVER_URL = `${normalizeBaseUrl(envVars.NEXT_PUBLIC_GAP_INDEXER_URL)}/mcp`;

/** Linked, so it must be the canonical host — the apex owes a 308. */
const MCP_CONNECT_URL = `${CANONICAL_HOST}/mcp/connect`;

interface AgentFaqEntry {
  question: string;
  answer: string;
}

interface UseCaseCard {
  title: string;
  description: string;
  example: string;
}

export const AGENT_FAQS: AgentFaqEntry[] = [
  {
    question: "Which AI apps does Karma's MCP server work with?",
    answer: `Karma provides a public MCP (Model Context Protocol) server over Streamable HTTP at ${MCP_SERVER_URL}. It works with Claude (claude.ai and the desktop app, via custom connectors), Cursor, Codex, and any MCP client supporting protocol version 2025-11-25 or later.`,
  },
  {
    question: "How do I connect Karma to Claude?",
    answer: `In Claude, open Settings, choose Connectors, click Add custom connector, paste ${MCP_SERVER_URL} as the remote MCP server URL, and sign in to Karma when prompted. Other MCP clients such as Cursor and Codex take the same URL as a remote server. The step-by-step guide with troubleshooting lives at ${MCP_CONNECT_URL}.`,
  },
  {
    question: "Which MCP operations require authentication?",
    answer:
      "Tool discovery is public — /mcp, /mcp/info, /mcp/tools, and /.well-known/mcp-tools.json need no credentials. Every tool call requires a signed-in session: OAuth 2.1 (your AI app walks you through Karma sign-in) or a Karma API key sent as the x-api-key header. The agent then inherits exactly your account's permissions.",
  },
  {
    question: "What can a Karma-connected AI agent do?",
    answer:
      "Read projects, grants, milestones, programs, and impact data; search Karma's funding-program registry; run natural-language research across nonprofits, foundations, funders, and IRS 990 filings; and pull program financials — the same data that powers the Karma dashboard. A grants team can run day-to-day program work from a chat: list the applications submitted to a program, summarize a project's grant and milestone history, and research prospective grantees. With OAuth and your permission, agents can also submit applications, draft updates, comment on reviews, and propose milestone evidence on your behalf.",
  },
  {
    question: "Can an AI agent draft and submit a grant application on our behalf?",
    answer:
      "Yes, with your permission. An agent can read a funding program's details and draft application copy against them, and with OAuth authorization it can submit the application on your behalf. You approve which capabilities the agent gets when you connect, every action is logged against your account, and you can revoke access at any time from your Karma settings.",
  },
  {
    question: "Can the agent take actions in my account?",
    answer:
      "Only the ones you authorize. Karma uses OAuth 2.0 with scoped access tokens; you approve which capabilities the agent gets when you connect, and you can revoke access at any time from your Karma settings.",
  },
  {
    question: "How do I limit what an agent can do?",
    answer:
      "Every tool call runs under your session — OAuth token or API key — so the agent inherits exactly the permissions of your Karma account, nothing more. Reads of public data work for any signed-in account; mutating actions additionally require the roles your account holds. Generate scoped API keys in settings for headless agents that should be even more limited.",
  },
  {
    question: "Where do I see what the agent has done?",
    answer:
      "Every action the agent takes is logged against your account in the same activity history you already use. Applications, comments, and updates are clearly attributed to your account.",
  },
  {
    question: "How does Karma compare to conventional grant platforms for AI agents?",
    answer:
      "Conventional grants-management platforms are typically operated through their own web dashboards. Karma additionally exposes its funding-program registry, project and grant data, and nonprofit research through a documented, publicly discoverable MCP server, so foundations and nonprofits can work with the same data directly from Claude, Cursor, Codex, or any other MCP-compatible AI app.",
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
 * Fallback only — rendered when the live `/mcp/tools` fetch fails at
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
