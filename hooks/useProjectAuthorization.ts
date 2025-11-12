import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";

/**
 * Generic hook to determine project-level authorization
 * Returns authorization flags for general and on-chain actions
 */
export const useProjectAuthorization = () => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const { isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();

  const isAuthorized = isOwner || isProjectAdmin || isCommunityAdmin;
  const isOnChainAuthorized = isProjectOwner || isContractOwner;

  return {
    isAuthorized,
    isOnChainAuthorized,
  };
};

