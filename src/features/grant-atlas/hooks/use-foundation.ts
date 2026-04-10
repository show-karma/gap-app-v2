"use client";

import { useQuery } from "@tanstack/react-query";
import { philanthropyService } from "../services/philanthropy.service";

export const foundationKeys = {
  all: ["philanthropy", "foundation"] as const,
  detail: (id: string) => [...foundationKeys.all, id] as const,
  grants: (id: string) => [...foundationKeys.all, id, "grants"] as const,
  officers: (id: string) => [...foundationKeys.all, id, "officers"] as const,
  financials: (id: string) => [...foundationKeys.all, id, "financials"] as const,
  filing: (id: string, year: number) => [...foundationKeys.all, id, "filing", year] as const,
};

export function useFoundation(id: string) {
  return useQuery({
    queryKey: foundationKeys.detail(id),
    queryFn: () => philanthropyService.getFoundation(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFoundationGrants(id: string) {
  return useQuery({
    queryKey: foundationKeys.grants(id),
    queryFn: () => philanthropyService.getFoundationGrants(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFoundationOfficers(id: string) {
  return useQuery({
    queryKey: foundationKeys.officers(id),
    queryFn: () => philanthropyService.getFoundationOfficers(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFoundationFinancials(id: string) {
  return useQuery({
    queryKey: foundationKeys.financials(id),
    queryFn: () => philanthropyService.getFoundationFinancials(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFoundationFiling(id: string, year: number) {
  return useQuery({
    queryKey: foundationKeys.filing(id, year),
    queryFn: () => philanthropyService.getFoundationFiling(id, year),
    enabled: Boolean(id) && year > 0,
    staleTime: 10 * 60 * 1000,
  });
}
