import { Permission, type PermissionString } from "../types/permission";
import { Role } from "../types/role";

export const PERMISSION_MATRIX: Record<Role, PermissionString[]> = {
  [Role.SUPER_ADMIN]: ["*"],

  // Registry Admin: Only manages the program registry (approve/reject programs)
  [Role.REGISTRY_ADMIN]: ["registry:*", Permission.PROGRAM_VIEW],

  [Role.COMMUNITY_ADMIN]: [
    "community:*",
    "program:*",
    "application:*",
    "comment:*",
    Permission.MILESTONE_VIEW_ALL,
    Permission.MILESTONE_APPROVE,
    Permission.MILESTONE_REJECT,
    Permission.REVIEW_VIEW_ALL,
    Permission.REVIEW_CREATE,
  ],

  // Program Creator: Above Program Admin, can manage admins (program context required)
  [Role.PROGRAM_CREATOR]: [
    Permission.PROGRAM_VIEW,
    Permission.PROGRAM_EDIT,
    Permission.PROGRAM_MANAGE_ADMINS,
    Permission.PROGRAM_MANAGE_REVIEWERS,
    Permission.PROGRAM_VIEW_ANALYTICS,
    Permission.APPLICATION_VIEW_ALL,
    Permission.APPLICATION_READ,
    Permission.APPLICATION_COMMENT,
    Permission.APPLICATION_APPROVE,
    Permission.APPLICATION_REJECT,
    Permission.APPLICATION_CHANGE_STATUS,
    Permission.MILESTONE_VIEW_ALL,
    Permission.MILESTONE_APPROVE,
    Permission.MILESTONE_REJECT,
    Permission.REVIEW_VIEW_ALL,
    Permission.REVIEW_CREATE,
    Permission.COMMENT_EDIT_OWN,
    Permission.COMMENT_DELETE_OWN,
  ],

  // Program Admin: Manages program operations (assigned by Program Creator)
  [Role.PROGRAM_ADMIN]: [
    Permission.PROGRAM_VIEW,
    Permission.PROGRAM_EDIT,
    Permission.PROGRAM_MANAGE_REVIEWERS,
    Permission.PROGRAM_VIEW_ANALYTICS,
    Permission.APPLICATION_VIEW_ALL,
    Permission.APPLICATION_READ,
    Permission.APPLICATION_COMMENT,
    Permission.APPLICATION_APPROVE,
    Permission.APPLICATION_REJECT,
    Permission.APPLICATION_CHANGE_STATUS,
    Permission.MILESTONE_VIEW_ALL,
    Permission.MILESTONE_APPROVE,
    Permission.MILESTONE_REJECT,
    Permission.REVIEW_VIEW_ALL,
    Permission.REVIEW_CREATE,
    Permission.COMMENT_EDIT_OWN,
    Permission.COMMENT_DELETE_OWN,
  ],

  [Role.PROGRAM_REVIEWER]: [
    Permission.PROGRAM_VIEW,
    Permission.APPLICATION_VIEW_ASSIGNED,
    Permission.APPLICATION_READ,
    Permission.APPLICATION_COMMENT,
    Permission.APPLICATION_REVIEW,
    Permission.APPLICATION_CHANGE_STATUS,
    Permission.REVIEW_CREATE,
    Permission.REVIEW_EDIT_OWN,
    Permission.COMMENT_EDIT_OWN,
    Permission.COMMENT_DELETE_OWN,
  ],

  [Role.MILESTONE_REVIEWER]: [
    Permission.PROGRAM_VIEW,
    Permission.MILESTONE_VIEW_ASSIGNED,
    Permission.MILESTONE_REVIEW,
    Permission.MILESTONE_APPROVE,
    Permission.MILESTONE_REJECT,
    Permission.APPLICATION_CHANGE_STATUS,
    Permission.REVIEW_CREATE,
    Permission.REVIEW_EDIT_OWN,
    Permission.COMMENT_EDIT_OWN,
    Permission.COMMENT_DELETE_OWN,
  ],

  [Role.APPLICANT]: [
    Permission.PROGRAM_VIEW,
    Permission.APPLICATION_VIEW_OWN,
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_EDIT_OWN,
    Permission.APPLICATION_READ,
    Permission.APPLICATION_COMMENT,
    Permission.MILESTONE_VIEW_OWN,
    Permission.MILESTONE_SUBMIT,
    Permission.COMMENT_EDIT_OWN,
    Permission.COMMENT_DELETE_OWN,
  ],

  [Role.GUEST]: [
    Permission.PROGRAM_VIEW,
    Permission.APPLICATION_READ,
    Permission.COMMENT_EDIT_OWN,
    Permission.COMMENT_DELETE_OWN,
  ],

  [Role.NONE]: [],
};

export function getPermissionsForRole(role: Role): PermissionString[] {
  return PERMISSION_MATRIX[role] ?? [];
}

export function getPermissionsForRoles(roles: Role[]): Permission[] {
  const permissionSet = new Set<Permission>();
  const wildcardPrefixes: string[] = [];
  let hasFullWildcard = false;

  for (const role of roles) {
    const rolePermissions = PERMISSION_MATRIX[role] ?? [];

    for (const permission of rolePermissions) {
      if (permission === "*") {
        hasFullWildcard = true;
        break;
      }

      if (permission.endsWith(":*")) {
        wildcardPrefixes.push(permission.slice(0, -1));
      } else {
        permissionSet.add(permission as Permission);
      }
    }

    if (hasFullWildcard) {
      break;
    }
  }

  if (hasFullWildcard) {
    return Object.values(Permission);
  }

  for (const prefix of wildcardPrefixes) {
    for (const permission of Object.values(Permission)) {
      if (permission.startsWith(prefix)) {
        permissionSet.add(permission);
      }
    }
  }

  return Array.from(permissionSet);
}

export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((p) => userPermissions.includes(p));
}
