import { useAuth } from "@/hooks/useAuth";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useIsReviewer } from "@/hooks/usePermissions";
import { useOwnerStore, useProjectStore } from "@/store";

/**
 * Consolidated hook for milestone/update/impact verification permissions.
 *
 * Separation of duties:
 * - Project owners/admins can **complete** milestones but CANNOT **verify** them
 * - Contract owners, community admins, and program reviewers CAN verify
 *
 * @param programId - Funding program ID (enables reviewer check)
 * @param communityUID - Community UID or slug (enables community admin check)
 */
export function useCanVerifyMilestone(programId?: string, communityUID?: string) {
  const { authenticated } = useAuth();
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const { isCommunityAdmin } = useIsCommunityAdmin(communityUID);
  const { isReviewer } = useIsReviewer(programId);

  const canVerify =
    authenticated &&
    !isProjectOwner &&
    !isProjectAdmin &&
    (isContractOwner || isCommunityAdmin || isReviewer);

  return { canVerify, isCommunityAdmin, isReviewer, isContractOwner };
}
