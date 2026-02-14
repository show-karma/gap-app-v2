// Components
export {
  AdminOnly,
  Can,
  Cannot,
  FundingPlatformGuard,
  PermissionDeniedMessage,
  RequirePermission,
  RequireReviewer,
  RequireRole,
  useIsFundingPlatformAdmin,
  useIsFundingPlatformReviewer,
} from "./components";
// Context and hooks
export {
  PermissionProvider,
  useCan,
  useCanAll,
  useCanAny,
  useHasRole,
  useHasRoleOrHigher,
  useIsCommunityAdmin,
  useIsGuestDueToError,
  useIsReviewer,
  useIsReviewerType,
  usePermissionContext,
  useUserRoles,
} from "./context";
export { permissionsKeys, usePermissionsQuery } from "./hooks/use-permissions";
export { useReviewerBridge } from "./hooks/use-reviewer-bridge";
export { useStaff } from "./hooks/use-staff-bridge";
// Policies
export {
  getPermissionsForRole,
  getPermissionsForRoles,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  PERMISSION_MATRIX,
} from "./policies";
// Services
export { authorizationService, type GetPermissionsParams } from "./services/authorization.service";
// Types
export type { PermissionString } from "./types/permission";
export { isValidPermission, Permission } from "./types/permission";
export type {
  PermissionContextValue,
  PermissionsResponse,
  ResourceContext,
} from "./types/resource";
export type { UserRoles } from "./types/role";
export {
  getHighestRole,
  getRoleLevel,
  isRoleAtLeast,
  isValidReviewerType,
  isValidRole,
  ReviewerType,
  ROLE_HIERARCHY,
  Role,
} from "./types/role";
