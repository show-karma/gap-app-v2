"use client";

// eslint-disable-next-line import/no-extraneous-dependencies
import debounce from "lodash.debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import type { IApplicationFilters } from "@/services/fundingPlatformService";

/**
 * Owns all filter, sort, reviewer-scope, and URL-sync state for the
 * applications list. Keeps `ApplicationListWithAPI` thin: the component
 * consumes `queryParams` (for the data hook and export) and renders the bars.
 */
export function useApplicationListFilters(initialFilters: IApplicationFilters = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { address } = useAccount();

  const [myReviewsOnly, setMyReviewsOnly] = useState(true);
  // Reviewer addresses selected in the "All Applications" dropdown (lowercased)
  const [selectedReviewerAddresses, setSelectedReviewerAddresses] = useState<string[]>([]);

  // Initialize filters from URL params (excluding page for infinite scroll)
  const [filters, setFilters] = useState<IApplicationFilters>(() => {
    const urlFilters = { ...initialFilters };
    if (searchParams.get("search")) urlFilters.search = searchParams.get("search")!;
    if (searchParams.get("status")) urlFilters.status = searchParams.get("status")!;
    if (searchParams.get("dateFrom")) urlFilters.dateFrom = searchParams.get("dateFrom")!;
    if (searchParams.get("dateTo")) urlFilters.dateTo = searchParams.get("dateTo")!;
    return urlFilters;
  });

  // Local state for search input (immediate UI updates)
  const [searchInput, setSearchInput] = useState(filters.search || "");

  const [sortBy, setSortBy] = useState<IApplicationFilters["sortBy"]>(
    () => (searchParams.get("sortBy") as IApplicationFilters["sortBy"]) || "status"
  );

  const [sortOrder, setSortOrder] = useState<IApplicationFilters["sortOrder"]>(
    () => (searchParams.get("sortOrder") as IApplicationFilters["sortOrder"]) || "asc"
  );

  // Debounced search (waits 500ms after the user stops typing)
  const debouncedSearch = useMemo(
    () =>
      debounce((searchValue: string) => {
        setFilters((prev) => ({ ...prev, search: searchValue || undefined }));
      }, 500),
    []
  );

  // Cleanup debounced function on unmount
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  // Active reviewer filter, shared across the list, stats, and export:
  // "My Applications" scopes to the current user; "All Applications" scopes to
  // the reviewer(s) selected in the dropdown (if any).
  const reviewerFilter = useMemo(
    () => ({
      reviewerAddress: myReviewsOnly && address ? address.toLowerCase() : undefined,
      reviewerAddresses:
        !myReviewsOnly && selectedReviewerAddresses.length > 0
          ? selectedReviewerAddresses
          : undefined,
    }),
    [myReviewsOnly, address, selectedReviewerAddresses]
  );

  // Combined params consumed by the data hook and the export action.
  const queryParams = useMemo<IApplicationFilters>(
    () => ({ ...filters, sortBy, sortOrder, ...reviewerFilter }),
    [filters, sortBy, sortOrder, reviewerFilter]
  );

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.dateFrom || filters.dateTo
  );

  // Sync filters and sorting with the URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    const syncParam = (key: string, value?: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };

    syncParam("search", filters.search);
    syncParam("status", filters.status);
    syncParam("dateFrom", filters.dateFrom);
    syncParam("dateTo", filters.dateTo);
    // "status" is the default, so omit it from the URL; persist every other
    // sort column (including "createdAt") so it survives a reload.
    syncParam("sortBy", sortBy && sortBy !== "status" ? sortBy : undefined);
    syncParam("sortOrder", sortOrder);

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [filters, sortBy, sortOrder, pathname, router, searchParams]);

  const handleFilterChange = useCallback((newFilters: IApplicationFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value); // Update UI immediately
      debouncedSearch(value); // Update filters after 500ms
    },
    [debouncedSearch]
  );

  const handleSortChange = useCallback(
    (newSortBy: string) => {
      const typedSortBy = newSortBy as IApplicationFilters["sortBy"];
      if (sortBy === typedSortBy) {
        // Toggle sort order if clicking the same column
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
      } else {
        // Set new sort column with default desc order
        setSortBy(typedSortBy);
        setSortOrder("desc");
      }
    },
    [sortBy]
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchInput("");
    setSelectedReviewerAddresses([]);
    debouncedSearch.cancel(); // Cancel any pending debounced search
    router.push(pathname, { scroll: false });
  }, [debouncedSearch, router, pathname]);

  return {
    filters,
    searchInput,
    sortBy,
    sortOrder,
    myReviewsOnly,
    setMyReviewsOnly,
    selectedReviewerAddresses,
    setSelectedReviewerAddresses,
    reviewerFilter,
    queryParams,
    hasActiveFilters,
    handleFilterChange,
    handleSearchChange,
    handleSortChange,
    clearFilters,
  };
}
