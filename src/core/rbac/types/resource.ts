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
  /**
   * Whether the user has admin access at the current context level.
   * - Global context: admin of any community
   * - Community context: admin of this community
   * - Program context: admin of this program
   */
  isAdmin: boolean;
  /**
   * Whether the user has reviewer access at the current context level.
   * - Global context: reviewer of any program
   * - Community context: reviewer of any program in this community
   * - Program context: reviewer of this program
   */
  isReviewer: boolean;
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
  /**
   * Whether the user has admin access at the current context level.
   */
  isAdmin: boolean;
  /**
   * Whether the user has reviewer access at the current context level.
   */
  isReviewer: boolean;
}
