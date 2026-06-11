"use client";

import { useQueryState } from "nuqs";
import { useCallback } from "react";

export type FundingProgramStatusFilter = "all" | "enabled" | "disabled";

const isValidStatus = (value: string | null): value is FundingProgramStatusFilter =>
  value === "enabled" || value === "disabled";

interface FundingProgramFiltersState {
  search: string;
  setSearch: (value: string) => void;
  status: FundingProgramStatusFilter;
  setStatus: (value: FundingProgramStatusFilter) => void;
}

/**
 * URL-backed filter state for the funding platform programs list.
 *
 * The query string is the single source of truth for the `search` and `status`
 * filters, so deep links such as `?search=foo&status=enabled` pre-apply the
 * filters and the back button steps cleanly. nuqs writes through
 * `history.replaceState`, which never dispatches an App Router navigation — so
 * typing in the search box cannot race or cancel a Link click (issue #1547).
 *
 * Filtering itself is a client-side `useMemo`, so the optimistic value returned
 * by nuqs keeps the input responsive while the URL write is throttled.
 */
export function useFundingProgramFilters(): FundingProgramFiltersState {
  const [search, setSearchQuery] = useQueryState("search", {
    defaultValue: "",
    throttleMs: 300,
  });

  const [statusRaw, setStatusQuery] = useQueryState<FundingProgramStatusFilter>("status", {
    defaultValue: "all",
    clearOnDefault: true,
    serialize: (value) => (isValidStatus(value) ? value : ""),
    parse: (value) => (isValidStatus(value) ? value : "all"),
  });

  const status = isValidStatus(statusRaw) ? statusRaw : "all";

  const setSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
    },
    [setSearchQuery]
  );

  const setStatus = useCallback(
    (value: FundingProgramStatusFilter) => {
      setStatusQuery(value);
    },
    [setStatusQuery]
  );

  return {
    search,
    setSearch,
    status,
    setStatus,
  };
}
