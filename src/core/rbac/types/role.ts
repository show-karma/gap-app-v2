export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  REGISTRY_ADMIN = "REGISTRY_ADMIN",
  COMMUNITY_ADMIN = "COMMUNITY_ADMIN",
  PROGRAM_ADMIN = "PROGRAM_ADMIN",
  PROGRAM_CREATOR = "PROGRAM_CREATOR",
  PROGRAM_REVIEWER = "PROGRAM_REVIEWER",
  MILESTONE_REVIEWER = "MILESTONE_REVIEWER",
  APPLICANT = "APPLICANT",
  GUEST = "GUEST",
  NONE = "NONE",
}

const ROLE_VALUES = new Set(Object.values(Role));

export function isValidRole(role: string): role is Role {
  return ROLE_VALUES.has(role as Role);
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.NONE]: -1,
  [Role.GUEST]: 0,
  [Role.APPLICANT]: 1,
  [Role.PROGRAM_REVIEWER]: 2,
  [Role.MILESTONE_REVIEWER]: 2,
  [Role.PROGRAM_CREATOR]: 3,
  [Role.PROGRAM_ADMIN]: 3,
  [Role.COMMUNITY_ADMIN]: 4,
  [Role.REGISTRY_ADMIN]: 5,
  [Role.SUPER_ADMIN]: 6,
};

export enum ReviewerType {
  PROGRAM = "PROGRAM",
  MILESTONE = "MILESTONE",
}

const REVIEWER_TYPE_VALUES = new Set(Object.values(ReviewerType));

export function isValidReviewerType(type: string): type is ReviewerType {
  return REVIEWER_TYPE_VALUES.has(type as ReviewerType);
}

export interface UserRoles {
  primaryRole: Role;
  roles: Role[];
  reviewerTypes?: ReviewerType[];
}

export function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

export function isRoleAtLeast(userRole: Role, requiredRole: Role): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

export function getHighestRole(roles: Role[]): Role {
  if (roles.length === 0) {
    return Role.GUEST;
  }
  return roles.reduce((highest, current) =>
    getRoleLevel(current) > getRoleLevel(highest) ? current : highest
  );
}
