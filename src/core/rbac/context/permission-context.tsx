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
  type Role,
  type UserRoles,
} from "../types";

const defaultUserRoles: UserRoles = {
  primaryRole: "GUEST" as Role,
  roles: ["GUEST" as Role],
  reviewerTypes: [],
};

const defaultResourceContext: ResourceContext = {};

const defaultContextValue: PermissionContextValue = {
  roles: defaultUserRoles,
  permissions: [],
  isLoading: true,
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
  const { data, isLoading } = usePermissionsQuery(resourceContext);

  const contextValue = useMemo<PermissionContextValue>(() => {
    const roles = data?.roles ?? defaultUserRoles;
    const permissions = data?.permissions ?? [];
    const context = data?.resourceContext ?? defaultResourceContext;

    return {
      roles,
      permissions,
      isLoading,
      resourceContext: context,
      can: (permission: Permission) => hasPermission(permissions, permission),
      canAny: (perms: Permission[]) => hasAnyPermission(permissions, perms),
      canAll: (perms: Permission[]) => hasAllPermissions(permissions, perms),
      hasRole: (role: string) => isValidRole(role) && roles.roles.includes(role),
      hasRoleOrHigher: (role: string) =>
        isValidRole(role) && isRoleAtLeast(roles.primaryRole, role),
      isReviewerType: (type: ReviewerType) => roles.reviewerTypes?.includes(type) ?? false,
    };
  }, [data, isLoading]);

  return <PermissionContext.Provider value={contextValue}>{children}</PermissionContext.Provider>;
}

export function usePermissionContext(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermissionContext must be used within a PermissionProvider");
  }
  return context;
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
  return !isLoading && hasRoleOrHigher("PROGRAM_ADMIN" as Role);
}

export function useIsCommunityAdmin(): boolean {
  const { hasRoleOrHigher, isLoading } = usePermissionContext();
  return !isLoading && hasRoleOrHigher("COMMUNITY_ADMIN" as Role);
}

export function useIsSuperAdmin(): boolean {
  const { hasRole, isLoading } = usePermissionContext();
  return !isLoading && hasRole("SUPER_ADMIN" as Role);
}

export function useIsReviewer(): boolean {
  const { roles, isLoading } = usePermissionContext();
  return (
    !isLoading &&
    (roles.roles.includes("PROGRAM_REVIEWER" as Role) ||
      roles.roles.includes("MILESTONE_REVIEWER" as Role))
  );
}
