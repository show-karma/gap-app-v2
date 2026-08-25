import type { PublicToolMetadata } from "./types";

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
