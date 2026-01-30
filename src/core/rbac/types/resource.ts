import type { Permission } from "./permission";
import type { ReviewerType, UserRoles } from "./role";

export interface ResourceContext {
  communityId?: string;
  programId?: string;
  applicationId?: string;
  milestoneId?: string;
}

export interface PermissionContextValue {
  roles: UserRoles;
  permissions: Permission[];
  isLoading: boolean;
  isGuestDueToError: boolean;
  resourceContext: ResourceContext;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  hasRole: (role: string) => boolean;
  hasRoleOrHigher: (role: string) => boolean;
  isReviewerType: (type: ReviewerType) => boolean;
}

export interface PermissionsResponse {
  roles: UserRoles;
  permissions: Permission[];
  resourceContext: ResourceContext;
}
