/**
 * Grant data hook — ported from
 * grant-atlas src/features/grant-atlas/hooks/use-grant.ts.
 */
import { useQuery } from "@tanstack/react-query";
import { resultToPromise } from "../lib/result-to-promise";
import { philanthropyService } from "../services/philanthropy.service";

const grantKeys = {
  all: ["philanthropy", "grant"] as const,
  detail: (id: string) => [...grantKeys.all, id] as const,
};

export function useGrant(id: string) {
  return useQuery({
    queryKey: grantKeys.detail(id),
    queryFn: () => resultToPromise(philanthropyService.getGrant(id)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}
