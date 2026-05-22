/**
 * Nonprofit data hooks — ported from
 * grant-atlas src/features/grant-atlas/hooks/use-nonprofit.ts.
 */
import { useQuery } from "@tanstack/react-query";
import { resultToPromise } from "../lib/result-to-promise";
import { philanthropyService } from "../services/philanthropy.service";

const nonprofitKeys = {
  all: ["philanthropy", "nonprofit"] as const,
  detail: (id: string) => [...nonprofitKeys.all, id] as const,
  grants: (id: string) => [...nonprofitKeys.all, id, "grants"] as const,
};

export function useNonprofit(id: string) {
  return useQuery({
    queryKey: nonprofitKeys.detail(id),
    queryFn: () => resultToPromise(philanthropyService.getNonprofit(id)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNonprofitGrants(id: string) {
  return useQuery({
    queryKey: nonprofitKeys.grants(id),
    queryFn: () => resultToPromise(philanthropyService.getNonprofitGrants(id)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}
