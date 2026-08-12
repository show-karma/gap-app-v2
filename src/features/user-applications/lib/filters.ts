import type { UserApplicationsFilters } from "../types";

/**
 * Whether the user has narrowed the applications list with any filter.
 *
 * Search and status filters are applied server-side, so a filter that matches
 * nothing comes back with zero applications AND zero status counts. Callers use
 * this to distinguish "the user has no applications at all" (a true empty state)
 * from "the current filter matched nothing" (a recoverable filtered state) — the
 * latter must keep the module and its filter bar mounted so the filter can be
 * cleared.
 */
export function hasActiveApplicationFilters(filters: UserApplicationsFilters): boolean {
  return (
    (filters.status ?? "all") !== "all" ||
    !!filters.programId ||
    !!filters.searchQuery ||
    !!filters.dateRange
  );
}
