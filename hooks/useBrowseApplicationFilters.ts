"use client";

import { useQueryState } from "nuqs";
import type { ApplicationStatus } from "@/types/whitelabel-entities";

export type BrowseApplicationStatusFilter = ApplicationStatus | "all";

const FILTERABLE_STATUSES: ApplicationStatus[] = [
  "pending",
  "under_review",
  "revision_requested",
  "approved",
  "rejected",
];

const isFilterableStatus = (value: string | null): value is ApplicationStatus =>
  value != null && (FILTERABLE_STATUSES as string[]).includes(value);

interface BrowseApplicationFiltersState {
  programId: string;
  setProgramId: (value: string) => void;
  status: BrowseApplicationStatusFilter;
  setStatus: (value: BrowseApplicationStatusFilter) => void;
  search: string;
  setSearch: (value: string) => void;
}

/**
 * URL-backed filter state for the community browse-applications view.
 *
 * The query string is the single source of truth for the `programId`, `status`
 * and `search` filters, so deep links pre-apply and the back button steps
 * cleanly. nuqs writes through `history.replaceState`, which never dispatches an
 * App Router navigation — so updating a filter cannot race or cancel a Link
 * click (issue #1547). Mirrors `useFundingProgramFilters`.
 */
export function useBrowseApplicationFilters(): BrowseApplicationFiltersState {
  const [programId, setProgramId] = useQueryState("programId", {
    defaultValue: "",
    clearOnDefault: true,
  });

  const [statusRaw, setStatus] = useQueryState<BrowseApplicationStatusFilter>("status", {
    defaultValue: "all",
    clearOnDefault: true,
    serialize: (value) => (isFilterableStatus(value) ? value : ""),
    parse: (value) => (isFilterableStatus(value) ? value : "all"),
  });

  const status = isFilterableStatus(statusRaw) ? statusRaw : "all";

  const [search, setSearch] = useQueryState("search", {
    defaultValue: "",
    clearOnDefault: true,
    throttleMs: 300,
  });

  return {
    programId,
    setProgramId,
    status,
    setStatus,
    search,
    setSearch,
  };
}
