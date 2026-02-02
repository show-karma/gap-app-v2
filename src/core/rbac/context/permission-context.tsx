"use client";

import { usePrivy } from "@privy-io/react-auth";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useAccount } from "wagmi";
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
  isLoading: false,
  isGuestDueToError: true, // Indicates usage outside PermissionProvider
  resourceContext: defaultResourceContext,
  hasReviewerAccessInCommunity: false,
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
  // Check authentication status - only fetch permissions when user is logged in
  const { authenticated, ready } = usePrivy();
  const { isConnected } = useAccount();
  const isAuthenticated = ready && authenticated && isConnected;

  const { data, isLoading, isError } = usePermissionsQuery(resourceContext, {
    enabled: isAuthenticated,
  });

  const contextValue = useMemo<PermissionContextValue>(() => {
    const roles = data?.roles ?? defaultUserRoles;
    const permissions = data?.permissions ?? [];
    const context = data?.resourceContext ?? defaultResourceContext;

    // Include Privy ready state in loading calculation
    // We're loading if Privy isn't ready OR the query is loading
    const effectiveIsLoading = !ready || isLoading;

    // User is in guest mode due to error if:
    // 1. There was an error fetching permissions, OR
    // 2. User is not authenticated (expected - they should be guest), OR
    // 3. No data was returned and loading is complete for an authenticated user
    const isGuestDueToError = isError || (!effectiveIsLoading && isAuthenticated && !data);

    return {
      roles,
      permissions,
      isLoading: effectiveIsLoading,
      isGuestDueToError,
      resourceContext: context,
      hasReviewerAccessInCommunity: data?.hasReviewerAccessInCommunity ?? false,
      can: (permission: Permission) => hasPermission(permissions, permission),
      canAny: (perms: Permission[]) => hasAnyPermission(permissions, perms),
      canAll: (perms: Permission[]) => hasAllPermissions(permissions, perms),
      hasRole: (role: string) => isValidRole(role) && roles.roles.includes(role),
      hasRoleOrHigher: (role: string) =>
        isValidRole(role) && isRoleAtLeast(roles.primaryRole, role),
      isReviewerType: (type: ReviewerType) => roles.reviewerTypes?.includes(type) ?? false,
    };
  }, [data, isLoading, isError, ready, isAuthenticated]);

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

export function useIsAdmin(): boolean {
  const { hasRoleOrHigher, isLoading } = usePermissionContext();
  return !isLoading && hasRoleOrHigher(Role.PROGRAM_ADMIN);
}

export function useIsCommunityAdmin(): boolean {
  const { hasRoleOrHigher, isLoading } = usePermissionContext();
  return !isLoading && hasRoleOrHigher(Role.COMMUNITY_ADMIN);
}

export function useIsSuperAdmin(): boolean {
  const { hasRole, isLoading } = usePermissionContext();
  return !isLoading && hasRole(Role.SUPER_ADMIN);
}

/**
 * Checks if user has reviewer role for the current program context.
 * When at community level (no programId), this returns false.
 * Use `useHasReviewerAccessInCommunity` to check community-level reviewer access.
 */
export function useIsReviewer(): boolean {
  const { roles, isLoading } = usePermissionContext();
  return (
    !isLoading &&
    (roles.roles.includes(Role.PROGRAM_REVIEWER) || roles.roles.includes(Role.MILESTONE_REVIEWER))
  );
}

/**
 * Checks if user has reviewer access to at least one program in the current community.
 * Only meaningful when at community level (communityId provided, no programId).
 * When at program level, use `useIsReviewer` instead.
 */
export function useHasReviewerAccessInCommunity(): boolean {
  const { hasReviewerAccessInCommunity, isLoading } = usePermissionContext();
  return !isLoading && hasReviewerAccessInCommunity;
}

export function useIsGuestDueToError(): boolean {
  const { isGuestDueToError } = usePermissionContext();
  return isGuestDueToError;
}
