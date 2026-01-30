"use client";

import type { ReactNode } from "react";
import { usePermissionContext } from "../context/permission-context";
import type { Permission, ReviewerType } from "../types";
import { Role } from "../types";

interface CanProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  role?: Role;
  roleOrHigher?: Role;
  reviewerType?: ReviewerType;
  children: ReactNode;
  fallback?: ReactNode;
  showWhileLoading?: boolean;
}

export function Can({
  permission,
  permissions,
  requireAll = false,
  role,
  roleOrHigher,
  reviewerType,
  children,
  fallback = null,
  showWhileLoading = false,
}: CanProps) {
  const { can, canAny, canAll, hasRole, hasRoleOrHigher, isReviewerType, isLoading } =
    usePermissionContext();

  if (isLoading) {
    return showWhileLoading ? <>{children}</> : <>{fallback}</>;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  } else if (role) {
    hasAccess = hasRole(role);
  } else if (roleOrHigher) {
    hasAccess = hasRoleOrHigher(roleOrHigher);
  } else if (reviewerType) {
    hasAccess = isReviewerType(reviewerType);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface CannotProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  role?: Role;
  children: ReactNode;
}

export function Cannot({
  permission,
  permissions,
  requireAll = false,
  role,
  children,
}: CannotProps) {
  const { can, canAny, canAll, hasRole, isLoading } = usePermissionContext();

  if (isLoading) {
    return null;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  } else if (role) {
    hasAccess = hasRole(role);
  }

  return hasAccess ? null : <>{children}</>;
}

interface RequirePermissionProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) {
  return (
    <Can permission={permission} fallback={fallback}>
      {children}
    </Can>
  );
}

interface RequireRoleProps {
  role: Role;
  orHigher?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRole({
  role,
  orHigher = false,
  children,
  fallback = null,
}: RequireRoleProps) {
  if (orHigher) {
    return (
      <Can roleOrHigher={role} fallback={fallback}>
        {children}
      </Can>
    );
  }
  return (
    <Can role={role} fallback={fallback}>
      {children}
    </Can>
  );
}

interface RequireReviewerProps {
  type?: ReviewerType;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireReviewer({ type, children, fallback = null }: RequireReviewerProps) {
  const { roles, isLoading } = usePermissionContext();

  if (isLoading) {
    return <>{fallback}</>;
  }

  const isReviewer =
    roles.roles.includes(Role.PROGRAM_REVIEWER) || roles.roles.includes(Role.MILESTONE_REVIEWER);

  if (!isReviewer) {
    return <>{fallback}</>;
  }

  if (type && !roles.reviewerTypes?.includes(type)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: "program" | "community" | "super";
}

export function AdminOnly({ children, fallback = null, level = "program" }: AdminOnlyProps) {
  const roleMap: Record<string, Role> = {
    program: Role.PROGRAM_ADMIN,
    community: Role.COMMUNITY_ADMIN,
    super: Role.SUPER_ADMIN,
  };

  return (
    <Can roleOrHigher={roleMap[level]} fallback={fallback}>
      {children}
    </Can>
  );
}
