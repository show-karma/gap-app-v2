"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  authorizationService,
  type GetPermissionsParams,
  isPermissionsTimeoutError,
} from "../services/authorization.service";

export const permissionsKeys = {
  all: ["permissions"] as const,
  context: (params: GetPermissionsParams) => [...permissionsKeys.all, params] as const,
};

interface UsePermissionsQueryOptions {
  /** Whether the user is authenticated - query will only run when true */
  enabled?: boolean;
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const status = (error as { status?: number }).status;
  if (status === 429) return true;

  const responseStatus = (error as { response?: { status?: number } }).response?.status;
  return responseStatus === 429;
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
    // Keep previous permissions visible while fetching new context (e.g., navigating
    // between programs). Prevents flash of "Access Denied" during query key transitions.
    placeholderData: keepPreviousData,
    // Avoid retry storms on rate limiting; retry other transient failures up to 2 times.
    //
    // Timeouts are NOT retried. Every retry keeps the query pending, and every
    // RBAC-gated surface holds its skeleton for the whole run — 3 × 15s plus
    // backoff is another ~48s of an apparently-frozen page. Surfacing the
    // failure immediately hands the user an explicit Retry control instead,
    // which is both faster and visible.
    retry: (failureCount, error) =>
      !isRateLimitError(error) && !isPermissionsTimeoutError(error) && failureCount < 2,
    enabled, // Only fetch when user is authenticated
  });
}
