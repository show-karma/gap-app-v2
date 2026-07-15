/**
 * Pure, framework-free helpers for the /projects explorer. Parses Next.js
 * search-param records into a strict effective request state and builds
 * crawlable pagination hrefs, so the server page, the client component, and the
 * pagination links all agree on one normalization policy (ADR 0001).
 */
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";

/** Shape of Next.js `searchParams` once resolved. */
export type ProjectsExplorerSearchParams = Record<string, string | string[] | undefined>;

/** The effective, fully-normalized explorer request. */
export interface ProjectsExplorerState {
  page: number;
  q: string;
  sortBy: ExplorerSortByOptions;
  sortOrder: ExplorerSortOrder;
  raisingFunds: boolean;
}

const BASE_PATH = "/projects";
const BROWSE_ANCHOR = "#browse-projects";
const DEFAULT_SORT_BY: ExplorerSortByOptions = "updatedAt";
const DEFAULT_SORT_ORDER: ExplorerSortOrder = "desc";

const VALID_SORT_BY: readonly ExplorerSortByOptions[] = [
  "createdAt",
  "updatedAt",
  "title",
  "noOfGrants",
  "noOfProjectMilestones",
  "noOfGrantMilestones",
];

/**
 * Parse a search-param record into the effective explorer state. Every field
 * falls back to its default when missing, array-valued, or invalid.
 */
export function parseProjectsExplorerRequest(
  params: ProjectsExplorerSearchParams
): ProjectsExplorerState {
  return {
    page: parsePage(params.page),
    q: firstString(params.q) ?? "",
    sortBy: parseSortBy(params.sortBy),
    sortOrder: parseSortOrder(params.sortOrder),
    raisingFunds: firstString(params.raisingFunds) === "true",
  };
}

/**
 * Build a crawlable href for a target page: preserve only non-default filters
 * (deterministic order q, sortBy, sortOrder, raisingFunds, then page), omit
 * page for page 1, encode values, and always end at #browse-projects.
 */
export function buildProjectsPageHref(state: ProjectsExplorerState, targetPage: number): string {
  const params: string[] = [];

  if (state.q) {
    params.push(`q=${encode(state.q)}`);
  }
  if (state.sortBy !== DEFAULT_SORT_BY) {
    params.push(`sortBy=${encode(state.sortBy)}`);
  }
  if (state.sortOrder !== DEFAULT_SORT_ORDER) {
    params.push(`sortOrder=${encode(state.sortOrder)}`);
  }
  if (state.raisingFunds) {
    params.push("raisingFunds=true");
  }
  if (targetPage > 1) {
    params.push(`page=${targetPage}`);
  }

  const query = params.length > 0 ? `?${params.join("&")}` : "";
  return `${BASE_PATH}${query}${BROWSE_ANCHOR}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parsePage(value: string | string[] | undefined): number {
  const raw = firstString(value);
  // Digits-only positive integer within the safe-integer range; everything else
  // (zero, negative, decimal, exponent, whitespace, empty, oversized, array).
  if (!raw || !/^\d+$/.test(raw)) {
    return 1;
  }
  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page < 1) {
    return 1;
  }
  return page;
}

function parseSortBy(value: string | string[] | undefined): ExplorerSortByOptions {
  const raw = firstString(value);
  return raw && (VALID_SORT_BY as readonly string[]).includes(raw)
    ? (raw as ExplorerSortByOptions)
    : DEFAULT_SORT_BY;
}

function parseSortOrder(value: string | string[] | undefined): ExplorerSortOrder {
  const raw = firstString(value);
  return raw === "asc" || raw === "desc" ? raw : DEFAULT_SORT_ORDER;
}

// Encode with encodeURIComponent so spaces become %20 (not +) deterministically.
function encode(value: string): string {
  return encodeURIComponent(value);
}
