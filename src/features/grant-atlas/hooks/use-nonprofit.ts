"use client";

import { useQuery } from "@tanstack/react-query";
import { philanthropyService } from "../services/philanthropy.service";

export const nonprofitKeys = {
  all: ["philanthropy", "nonprofit"] as const,
  detail: (id: string) => [...nonprofitKeys.all, id] as const,
  grants: (id: string) => [...nonprofitKeys.all, id, "grants"] as const,
};

export function useNonprofit(id: string) {
  return useQuery({
    queryKey: nonprofitKeys.detail(id),
    queryFn: () => philanthropyService.getNonprofit(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNonprofitGrants(id: string) {
  return useQuery({
    queryKey: nonprofitKeys.grants(id),
    queryFn: () => philanthropyService.getNonprofitGrants(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}
