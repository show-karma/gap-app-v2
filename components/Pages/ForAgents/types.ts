/**
 * Mirrors the `PublicToolMetadata` shape exposed by gap-indexer's
 * `/v2/mcp/tools` discovery endpoint. The frontend re-declares the type
 * (rather than depending on @show-karma/shared-types) because the catalog
 * is a fully decoupled, fetch-with-fallback surface — the indexer is the
 * source of truth at runtime, not at build time.
 */
export interface PublicToolMetadata {
  /** Canonical tool name (legacy form), e.g. `get_project_details`. */
  name: string;
  /**
   * `karma_*` namespace alias when one exists. Omitted when the tool has
   * not been migrated to the namespaced form yet.
   */
  alias: string | undefined;
  /** Capability description, ≤200 chars on the indexer side. */
  description: string;
  /** High-level functional grouping. */
  category: ToolCategory;
  /** Always `false` for tools listed on the public discovery surface. */
  requiresAuth: boolean;
}

export type ToolCategory =
  | "project"
  | "program"
  | "milestone"
  | "payout"
  | "application"
  | "community"
  | "knowledge"
  | "workflow"
  | "philanthropy"
  | "web_research"
  | "grant_agreement";

/**
 * Friendly labels used in the catalog UI. Keys mirror the union exhaustively
 * so a new category added on the indexer without a label here will fail
 * `tsc` at the lookup site.
 */
export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  project: "Projects",
  program: "Programs",
  milestone: "Milestones",
  payout: "Payouts",
  application: "Applications",
  community: "Communities",
  knowledge: "Knowledge & docs",
  workflow: "Discovery & workflow",
  philanthropy: "Philanthropy data",
  web_research: "Web research",
  grant_agreement: "Grant agreements",
};

/**
 * Stable display order — surfaces the most actionable categories first,
 * then supporting/auxiliary ones. Independent of alphabetical labelling
 * so we can move things around without renaming categories.
 */
export const CATEGORY_DISPLAY_ORDER: readonly ToolCategory[] = [
  "project",
  "program",
  "application",
  "milestone",
  "payout",
  "grant_agreement",
  "community",
  "philanthropy",
  "knowledge",
  "workflow",
  "web_research",
];
