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
   * Whether the user has community admin access at the current context level.
   * - Global context: admin of any community
   * - Community context: admin of this community
   * True for: SUPER_ADMIN, COMMUNITY_ADMIN
   */
  isCommunityAdmin: boolean;
  /**
   * Whether the user has program-level admin access.
   * Used for "Manage Program" button visibility.
   */
  isProgramAdmin: boolean;
  /**
   * Whether the user has reviewer access at the current context level.
   * - Global context: reviewer of any program
   * - Community context: reviewer of any program in this community
   * - Program context: reviewer of this program
   */
  isReviewer: boolean;
  /**
   * Whether the user is a Registry Admin (member of Karma Allo profile).
   * Registry admins have elevated permissions across the platform.
   */
  isRegistryAdmin: boolean;
  /**
   * Whether the user is a Program Creator (has created programs in the registry).
   * Program creators can manage their own programs in the funding map.
   */
  isProgramCreator: boolean;
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
   * Whether the user has community admin access at the current context level.
   */
  isCommunityAdmin: boolean;
  /**
   * Whether the user has program-level admin access.
   */
  isProgramAdmin: boolean;
  /**
   * Whether the user has reviewer access at the current context level.
   */
  isReviewer: boolean;
  /**
   * Whether the user is a Registry Admin (member of Karma Allo profile).
   */
  isRegistryAdmin: boolean;
  /**
   * Whether the user is a Program Creator (has created programs in the registry).
   */
  isProgramCreator: boolean;
}
