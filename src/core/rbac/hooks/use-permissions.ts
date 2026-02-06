"use client";

import { useQuery } from "@tanstack/react-query";
import { authorizationService, type GetPermissionsParams } from "../services/authorization.service";

export const permissionsKeys = {
  all: ["permissions"] as const,
  context: (params: GetPermissionsParams) => [...permissionsKeys.all, params] as const,
};

interface UsePermissionsQueryOptions {
  /** Whether the user is authenticated - query will only run when true */
  enabled?: boolean;
}

export function usePermissionsQuery(
  params: GetPermissionsParams = {},
  options: UsePermissionsQueryOptions = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: permissionsKeys.context(params),
    queryFn: () => authorizationService.getPermissions(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - permissions don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Avoid excessive refetches on tab switch
    retry: 2, // Retry failed requests twice
    enabled, // Only fetch when user is authenticated
  });
}
