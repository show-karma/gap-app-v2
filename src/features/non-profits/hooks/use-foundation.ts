/**
 * Foundation data hooks — ported from
 * grant-atlas src/features/grant-atlas/hooks/use-foundation.ts.
 *
 * Uses TanStack Query with resultToPromise to bridge neverthrow results.
 * Sort state management via useSortState is included for convenience.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { resultToPromise } from "../lib/result-to-promise";
import { philanthropyService, type SortOption } from "../services/philanthropy.service";

export const foundationKeys = {
  all: ["philanthropy", "foundation"] as const,
  detail: (id: string) => [...foundationKeys.all, id] as const,
  grants: (id: string, sort?: SortOption) =>
    [...foundationKeys.all, id, "grants", sort?.sortBy ?? "", sort?.sortOrder ?? ""] as const,
  officers: (id: string, sort?: SortOption) =>
    [...foundationKeys.all, id, "officers", sort?.sortBy ?? "", sort?.sortOrder ?? ""] as const,
  financials: (id: string, sort?: SortOption) =>
    [...foundationKeys.all, id, "financials", sort?.sortBy ?? "", sort?.sortOrder ?? ""] as const,
};

export function useFoundation(id: string) {
  return useQuery({
    queryKey: foundationKeys.detail(id),
    queryFn: () => resultToPromise(philanthropyService.getFoundation(id)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFoundationGrants(id: string, sort?: SortOption) {
  return useQuery({
    queryKey: foundationKeys.grants(id, sort),
    queryFn: () => resultToPromise(philanthropyService.getFoundationGrants(id, sort)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFoundationOfficers(id: string, sort?: SortOption) {
  return useQuery({
    queryKey: foundationKeys.officers(id, sort),
    queryFn: () => resultToPromise(philanthropyService.getFoundationOfficers(id, sort)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFoundationFinancials(id: string, sort?: SortOption) {
  return useQuery({
    queryKey: foundationKeys.financials(id, sort),
    queryFn: () => resultToPromise(philanthropyService.getFoundationFinancials(id, sort)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Manages sort state for a table column set.
 * Toggling the active field flips asc/desc; toggling a new field resets to desc.
 */
export function useSortState(defaultField: string, defaultOrder: "asc" | "desc" = "desc") {
  const [sort, setSort] = useState<SortOption>({ sortBy: defaultField, sortOrder: defaultOrder });

  const toggle = (field: string) => {
    setSort((prev) => {
      if (prev.sortBy === field) {
        return { sortBy: field, sortOrder: prev.sortOrder === "desc" ? "asc" : "desc" };
      }
      return { sortBy: field, sortOrder: "desc" };
    });
  };

  return { sort, toggle };
}
