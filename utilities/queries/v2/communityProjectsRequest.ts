/**
 * Pure, framework-free helpers for the community project hubs
 * (`/community/[communityId]` and `/community/[communityId]/projects`).
 *
 * These live outside the `"use client"` hook so the server pages can call them
 * to build the exact same indexer request the client's first fetch would issue,
 * which is what lets the server response be handed to React Query as a seed
 * (ADR 0001, mirroring `utilities/projects-explorer-request.ts`).
 */
import type { MaturityStageOptions, SortByOptions, StatusOptions } from "@/types";

/** Shape of Next.js `searchParams` once resolved. */
export type CommunityProjectsSearchParams = Record<string, string | string[] | undefined>;

/** Page size shared by the server seed fetch and the client infinite query. */
export const COMMUNITY_PROJECTS_PAGE_SIZE = 12;

/** Sort the hubs render with when no `sortBy` query param is present. */
export const DEFAULT_COMMUNITY_SORT: SortByOptions = "milestones";

const SORT_MAPPINGS: Record<SortByOptions, string> = {
  recent: "recent",
  completed: "completed",
  milestones: "milestones",
  txnCount: "transactions_desc",
};

/** Translate a UI sort option into the indexer's `sortBy` value. */
export function mapSortToApiValue(sortOption: SortByOptions): string {
  return SORT_MAPPINGS[sortOption];
}

/** Translate a maturity-stage filter into the indexer's `status` value. */
export function getStatusFromMaturityStage(stage: MaturityStageOptions): StatusOptions | undefined {
  if (stage === "all") return undefined;
  return `maturity-stage-${stage}` as StatusOptions;
}

/**
 * Read the effective page from a search-param record. Missing, array-valued,
 * non-numeric, zero, negative and oversized values all fall back to page 1.
 */
export function parseCommunityProjectsPage(params?: CommunityProjectsSearchParams): number {
  const raw = params?.page;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    return 1;
  }
  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page < 1) {
    return 1;
  }
  return page;
}

/**
 * Build a crawlable href for a target page of a community hub. `basePath` must
 * come from the `PAGES.COMMUNITY.*` route constants. Page 1 keeps the bare path
 * so the canonical URL never gains a redundant `?page=1`.
 */
export function buildCommunityProjectsPageHref(basePath: string, targetPage: number): string {
  if (targetPage <= 1) {
    return basePath;
  }
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}page=${targetPage}`;
}
