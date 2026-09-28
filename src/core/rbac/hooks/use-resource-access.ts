"use client";

import { useAuth } from "@/hooks/useAuth";
import { useProjectStore } from "@/store";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { Permission } from "../types/permission";
import { ReviewerType, Role } from "../types/role";
import { usePermissionsQuery } from "./use-permissions";

interface ProjectAccess {
  canEdit: boolean;
  canManageLinks: boolean;
  canManageMembers: boolean;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Backend-resolved project access for the current user, across ALL their linked
 * wallets (the backend is the single source of truth — no client-side on-chain
 * checks). Returns the action-scoped flags the UI gates on.
 */
export function useProjectAccess(projectId?: string, chainId?: number): ProjectAccess {
  const { isAuthenticated } = useAuth();
  const query = usePermissionsQuery(
    { projectId, chainId },
    { enabled: isAuthenticated && Boolean(projectId) }
  );
  const permissions = query.data?.permissions ?? [];

  return {
    canEdit: permissions.includes(Permission.PROJECT_EDIT),
    canManageLinks: permissions.includes(Permission.PROJECT_MANAGE_LINKS),
    canManageMembers: permissions.includes(Permission.PROJECT_MANAGE_MEMBERS),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

interface GrantMilestoneAccess {
  canEdit: boolean;
  canComplete: boolean;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Backend-resolved access for a GRANT milestone, scoped to the grant's community
 * (fixes the global-`isCommunityAdmin` bug where a community admin saw actions on
 * grants outside their community). Resolved across all linked wallets.
 */
export function useGrantMilestoneAccess(
  milestoneUID?: string,
  chainId?: number
): GrantMilestoneAccess {
  const { isAuthenticated } = useAuth();
  const query = usePermissionsQuery(
    { milestoneId: milestoneUID, chainId },
    {
      enabled: isAuthenticated && Boolean(milestoneUID) && chainId !== undefined,
    }
  );
  const canEdit = (query.data?.permissions ?? []).includes(Permission.MILESTONE_EDIT);

  return {
    canEdit,
    canComplete: canEdit,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * Backend-resolved "is the current user a community admin of THIS community",
 * scoped to the given community (vs the global `useIsCommunityAdmin()` flag).
 * Use for grant-scoped actions so a community admin of community A can't act on
 * a grant in community B.
 */
export function useScopedCommunityAdmin(
  communityUID?: string,
  chainId?: number
): { isCommunityAdmin: boolean; isLoading: boolean } {
  const { isAuthenticated } = useAuth();
  const query = usePermissionsQuery(
    { communityId: communityUID, chainId },
    { enabled: isAuthenticated && Boolean(communityUID) }
  );

  return {
    isCommunityAdmin: query.data?.isCommunityAdmin === true,
    isLoading: query.isLoading,
  };
}

interface GrantMilestoneVerifyAccessParams {
  communityUID?: string;
  programId?: string;
  chainId?: number;
}

interface GrantMilestoneVerifyAccess {
  canVerify: boolean;
  isMilestoneReviewer: boolean;
  isLoading: boolean;
}

/**
 * Backend-resolved "may the current user verify a grant milestone from the
 * project page". Reviewers of the grant's program, admins of the grant's
 * community and staff qualify, across all linked wallets. Project owners and
 * admins never do, even when they also hold one of those roles: completing
 * and verifying the same milestone must be separate people.
 */
export function useGrantMilestoneVerifyAccess({
  communityUID,
  programId,
  chainId,
}: GrantMilestoneVerifyAccessParams): GrantMilestoneVerifyAccess {
  const { isAuthenticated } = useAuth();
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const normalizedProgramId = programId ? normalizeProgramId(programId) : undefined;
  const query = usePermissionsQuery(
    { communityId: communityUID, programId: normalizedProgramId, chainId },
    { enabled: isAuthenticated && Boolean(communityUID || normalizedProgramId) }
  );
  const roles = query.data?.roles;
  const isMilestoneReviewer = roles?.reviewerTypes?.includes(ReviewerType.MILESTONE) ?? false;
  const isSuperAdmin = roles?.roles?.includes(Role.SUPER_ADMIN) ?? false;
  const hasReviewAuthority =
    query.data?.isCommunityAdmin === true || isMilestoneReviewer || isSuperAdmin;

  return {
    canVerify:
      isAuthenticated &&
      !query.isPlaceholderData &&
      hasReviewAuthority &&
      !isProjectOwner &&
      !isProjectAdmin,
    isMilestoneReviewer,
    isLoading: query.isLoading,
  };
}
