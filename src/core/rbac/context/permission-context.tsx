"use client";

import { usePrivy } from "@privy-io/react-auth";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getCypressMockAuthState } from "@/utilities/auth/cypress-auth";
import { usePermissionsQuery } from "../hooks/use-permissions";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "../policies";
import type { GetPermissionsParams } from "../services/authorization.service";
import {
  isRoleAtLeast,
  isValidRole,
  type Permission,
  type PermissionContextValue,
  type ResourceContext,
  type ReviewerType,
  Role,
  type UserRoles,
} from "../types";

const defaultUserRoles: UserRoles = {
  primaryRole: Role.GUEST,
  roles: [Role.GUEST],
  reviewerTypes: [],
};

const defaultResourceContext: ResourceContext = {};

const defaultContextValue: PermissionContextValue = {
  roles: defaultUserRoles,
  permissions: [],
  isLoading: true,
  isGuestDueToError: false,
  resourceContext: defaultResourceContext,
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
  can: () => false,
  canAny: () => false,
  canAll: () => false,
  hasRole: () => false,
  hasRoleOrHigher: () => false,
  isReviewerType: () => false,
};

const PermissionContext = createContext<PermissionContextValue>(defaultContextValue);

interface PermissionProviderProps {
  children: ReactNode;
  resourceContext?: GetPermissionsParams;
}

export function PermissionProvider({ children, resourceContext = {} }: PermissionProviderProps) {
  const { authenticated, ready } = usePrivy();
  // Track client-side hydration so getCypressMockAuthState() is re-evaluated
  // after SSR. During SSR, window is undefined so the check returns null.
  // Without this, useMemo caches the SSR result and never re-checks on the client
  // when Privy's ready/authenticated haven't changed yet.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const cypressMockAuthState = useMemo(
    () => getCypressMockAuthState(),
    [ready, authenticated, isClient]
  );
  const isCypressMockAuthenticated = Boolean(cypressMockAuthState?.authenticated);

  const isAuthenticated = isCypressMockAuthenticated || (ready && authenticated);

  const { data, isLoading, isError } = usePermissionsQuery(resourceContext, {
    enabled: isAuthenticated,
  });

  const contextValue = useMemo<PermissionContextValue>(() => {
    const roles = data?.roles ?? defaultUserRoles;
    const permissions = data?.permissions ?? [];
    const context = data?.resourceContext ?? defaultResourceContext;

    // Keep loading while Privy initializes
    const privyNotReady = isCypressMockAuthenticated ? false : !ready;
    // If we believe the user is authenticated (Privy says so) but we don't
    // have permission data yet, stay in loading state. This covers ALL race
    // conditions: Wagmi not connected yet, query disabled, query in-flight, etc.
    const believedAuthenticated = isCypressMockAuthenticated || (ready && authenticated);
    const awaitingPermissions = believedAuthenticated && !data && !isError;
    const effectiveIsLoading = privyNotReady || awaitingPermissions || isLoading;
    const isGuestDueToError = isError || (!effectiveIsLoading && isAuthenticated && !data);

    return {
      roles,
      permissions,
      isLoading: effectiveIsLoading,
      isGuestDueToError,
      resourceContext: context,
      isCommunityAdmin: data?.isCommunityAdmin ?? false,
      isProgramAdmin: data?.isProgramAdmin ?? false,
      isReviewer: data?.isReviewer ?? false,
      isRegistryAdmin: data?.isRegistryAdmin ?? false,
      isProgramCreator: data?.isProgramCreator ?? false,
      can: (permission: Permission) => hasPermission(permissions, permission),
      canAny: (perms: Permission[]) => hasAnyPermission(permissions, perms),
      canAll: (perms: Permission[]) => hasAllPermissions(permissions, perms),
      hasRole: (role: string) => isValidRole(role) && roles.roles.includes(role),
      hasRoleOrHigher: (role: string) =>
        isValidRole(role) && isRoleAtLeast(roles.primaryRole, role),
      isReviewerType: (type: ReviewerType) => roles.reviewerTypes?.includes(type) ?? false,
    };
  }, [data, isLoading, isError, ready, authenticated, isAuthenticated, isCypressMockAuthenticated]);

  return <PermissionContext.Provider value={contextValue}>{children}</PermissionContext.Provider>;
}

export function usePermissionContext(): PermissionContextValue {
  return useContext(PermissionContext);
}

export function useCan(permission: Permission): boolean {
  const { can, isLoading } = usePermissionContext();
  return !isLoading && can(permission);
}

export function useCanAny(permissions: Permission[]): boolean {
  const { canAny, isLoading } = usePermissionContext();
  return !isLoading && canAny(permissions);
}

export function useCanAll(permissions: Permission[]): boolean {
  const { canAll, isLoading } = usePermissionContext();
  return !isLoading && canAll(permissions);
}

export function useHasRole(role: Role): boolean {
  const { hasRole, isLoading } = usePermissionContext();
  return !isLoading && hasRole(role);
}

export function useHasRoleOrHigher(role: Role): boolean {
  const { hasRoleOrHigher, isLoading } = usePermissionContext();
  return !isLoading && hasRoleOrHigher(role);
}

export function useIsReviewerType(type: ReviewerType): boolean {
  const { isReviewerType, isLoading } = usePermissionContext();
  return !isLoading && isReviewerType(type);
}

export function useUserRoles(): UserRoles {
  const { roles } = usePermissionContext();
  return roles;
}

export function useIsCommunityAdmin(): boolean {
  const { isCommunityAdmin, isLoading } = usePermissionContext();
  return !isLoading && isCommunityAdmin;
}

export function useIsReviewer(): boolean {
  const { isReviewer, isLoading } = usePermissionContext();
  return !isLoading && isReviewer;
}

export function useIsGuestDueToError(): boolean {
  const { isGuestDueToError } = usePermissionContext();
  return isGuestDueToError;
}
