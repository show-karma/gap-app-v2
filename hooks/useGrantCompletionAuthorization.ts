import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";

/**
 * Hook to determine authorization for grant completion actions
 */
export const useGrantCompletionAuthorization = () => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const { isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();

  const isAuthorized = isOwner || isProjectAdmin || isCommunityAdmin;
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
  const canComplete = isAuthorized;

  return {
    isAuthorized,
    isOnChainAuthorized,
    canComplete,
  };
};
