"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
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
  const { data, isLoading, isError } = usePermissionsQuery(resourceContext);

  const contextValue = useMemo<PermissionContextValue>(() => {
    const roles = data?.roles ?? defaultUserRoles;
    const permissions = data?.permissions ?? [];
    const context = data?.resourceContext ?? defaultResourceContext;

    // User is in guest mode due to error if:
    // 1. There was an error fetching permissions, OR
    // 2. No data was returned and loading is complete
    const isGuestDueToError = isError || (!isLoading && !data);

    return {
      roles,
      permissions,
      isLoading,
      isGuestDueToError,
      resourceContext: context,
      can: (permission: Permission) => hasPermission(permissions, permission),
      canAny: (perms: Permission[]) => hasAnyPermission(permissions, perms),
      canAll: (perms: Permission[]) => hasAllPermissions(permissions, perms),
      hasRole: (role: string) => isValidRole(role) && roles.roles.includes(role),
      hasRoleOrHigher: (role: string) =>
        isValidRole(role) && isRoleAtLeast(roles.primaryRole, role),
      isReviewerType: (type: ReviewerType) => roles.reviewerTypes?.includes(type) ?? false,
    };
  }, [data, isLoading, isError]);

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

export function useIsReviewer(): boolean {
  const { roles, isLoading } = usePermissionContext();
  return (
    !isLoading &&
    (roles.roles.includes(Role.PROGRAM_REVIEWER) || roles.roles.includes(Role.MILESTONE_REVIEWER))
  );
}

export function useIsGuestDueToError(): boolean {
  const { isGuestDueToError } = usePermissionContext();
  return isGuestDueToError;
}
