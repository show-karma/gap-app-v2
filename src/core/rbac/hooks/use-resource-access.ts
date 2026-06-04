"use client";

import { useAuth } from "@/hooks/useAuth";
import { Permission } from "../types/permission";
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
