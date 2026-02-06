"use client";

import { useQuery } from "@tanstack/react-query";
import { authorizationService, type GetPermissionsParams } from "../services/authorization.service";

export const permissionsKeys = {
  all: ["permissions"] as const,
  context: (params: GetPermissionsParams) => [...permissionsKeys.all, params] as const,
};

export function usePermissionsQuery(params: GetPermissionsParams = {}) {
  return useQuery({
    queryKey: permissionsKeys.context(params),
    queryFn: () => authorizationService.getPermissions(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
