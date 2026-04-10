"use client";

import { useQuery } from "@tanstack/react-query";
import { philanthropyService } from "../services/philanthropy.service";

export const grantKeys = {
  all: ["philanthropy", "grant"] as const,
  detail: (id: string) => [...grantKeys.all, id] as const,
};

export function useGrant(id: string) {
  return useQuery({
    queryKey: grantKeys.detail(id),
    queryFn: () => philanthropyService.getGrant(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}
