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
   * When true, indicates the user has reviewer access to at least one program
   * in the current community context. Only set when communityId is provided without programId.
   */
  hasReviewerAccessInCommunity: boolean;
  /**
   * When true, indicates the user has admin access to at least one community.
   * Only set when no communityId is provided (global context).
   */
  hasAdminAccessInAnyCommunity: boolean;
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
   * When true, indicates the user has reviewer access to at least one program
   * in the specified community. Only set when communityId is provided without programId.
   * Use the /v2/funding-program-configs/my-reviewer-programs endpoint to get the
   * specific programs the user can review.
   */
  hasReviewerAccessInCommunity?: boolean;
  /**
   * When true, indicates the user has admin access to at least one community.
   * Only set when no communityId is provided (global context).
   * Use the /v2/user/communities/admin endpoint to get the specific communities.
   */
  hasAdminAccessInAnyCommunity?: boolean;
}
