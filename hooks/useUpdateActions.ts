import type {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useGap } from "@/hooks/useGap";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { getProjectGrants } from "@/services/project-grants.service";
import { getProjectImpacts } from "@/services/project-impacts.service";
import { getProjectUpdates } from "@/services/project-updates.service";
import { useOwnerStore, useProjectStore } from "@/store";
import type { ConversionGrantUpdate } from "@/types/v2/roadmap";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { retryUntilConditionMet } from "@/utilities/retries";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { useWallet } from "./useWallet";

type UpdateType =
  | IProjectUpdate
  | IGrantUpdate
  | IMilestoneResponse
  | IProjectImpact
  | IProjectMilestoneResponse
  | ConversionGrantUpdate;

export const useUpdateActions = (update: UpdateType) => {
  const [isDeletingUpdate, setIsDeletingUpdate] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { startAttestation, showSuccess, showError, changeStepperStep, dismiss } =
    useAttestationToast();
  const { gap } = useGap();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const { project, isProjectOwner } = useProjectStore();
  const projectIdOrSlug = project?.details?.slug || project?.uid || "";
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isOnChainAuthorized = isProjectOwner || isOwner;
  const projectId = useParams().projectId as string;
  const router = useRouter();
  const { performOffChainRevoke } = useOffChainRevoke();

  // Function to refresh data after successful deletion
  const refreshDataAfterDeletion = async () => {
    try {
      // Invalidate all relevant query caches
      await Promise.all([
        // Milestone-related queries
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PROJECT.UPDATES(projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["projectMilestones", project?.uid],
        }),
        // Project-related queries
        queryClient.invalidateQueries({
          queryKey: ["project", project?.uid],
        }),
        queryClient.invalidateQueries({
          queryKey: ["project", project?.details?.slug],
        }),
        // Grant-related queries
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PROJECT.GRANTS(projectIdOrSlug),
        }),
        // Impact-related queries
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PROJECT.IMPACTS(projectIdOrSlug),
        }),
      ]);

      // Force a router refresh to update components that use direct API calls
      // This will refresh the ProjectFeed component which doesn't use React Query
      router.refresh();
    } catch (error) {
      console.warn("Failed to refresh data after deletion:", error);
    }
  };

  const deleteUpdate = async () => {
    try {
      setIsDeletingUpdate(true);
      startAttestation(`Deleting ${update.type.toLowerCase()}...`);
      const updateChainID = "chainID" in update ? update.chainID : undefined;
      if (!updateChainID) {
        errorManager("Cannot delete update: missing chain ID", new Error("Missing chainID"));
        setIsDeletingUpdate(false);
        return;
      }

      const setup = await setupChainAndWallet({
        targetChainId: updateChainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        setIsDeletingUpdate(false);
        return;
      }

      const { gapClient, walletSigner } = setup;

      let findUpdate: any = null;
      let deleteMessage = "";
      let _deleteErrorMessage = "";

      // Handle different update types
      switch (update.type) {
        case "ProjectUpdate": {
          const instanceProject = await gapClient.fetch.projectById(project?.uid);
          if (!instanceProject) throw new Error("Project not found");

          findUpdate = instanceProject.updates.find((upd) => upd.uid === update.uid);
          if (!findUpdate) throw new Error("Project update not found");

          deleteMessage = MESSAGES.PROJECT_UPDATE_FORM.DELETE.SUCCESS;
          _deleteErrorMessage = MESSAGES.PROJECT_UPDATE_FORM.DELETE.ERROR;
          break;
        }

        case "ProjectImpact": {
          const instanceProject = await gapClient.fetch.projectById(project?.uid);
          if (!instanceProject) throw new Error("Project not found");

          findUpdate = instanceProject.impacts?.find((impact) => impact.uid === update.uid);
          if (!findUpdate) throw new Error("Project impact not found");

          deleteMessage = MESSAGES.PROJECT.IMPACT.REMOVE.SUCCESS;
          _deleteErrorMessage = MESSAGES.PROJECT.IMPACT.REMOVE.ERROR;
          break;
        }

        case "GrantUpdate": {
          const instanceProject = await gapClient.fetch.projectById(project?.uid);
          if (!instanceProject) throw new Error("Project not found");

          const grantInstance = instanceProject.grants.find(
            (grant) => grant.uid.toLowerCase() === update.refUID.toLowerCase()
          );
          if (!grantInstance) throw new Error("Grant not found");

          findUpdate = grantInstance.updates.find(
            (grantUpdate) => grantUpdate.uid.toLowerCase() === update.uid.toLowerCase()
          );
          if (!findUpdate) throw new Error("Grant update not found");

          deleteMessage = MESSAGES.GRANT.GRANT_UPDATE.UNDO.SUCCESS;
          _deleteErrorMessage = MESSAGES.GRANT.GRANT_UPDATE.UNDO.ERROR;
          break;
        }

        default:
          throw new Error(`Unsupported update type: ${update.type}`);
      }

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            let stillExists = false;

            switch (update.type) {
              case "ProjectUpdate": {
                const fetchedUpdates = await getProjectUpdates(projectIdOrSlug);
                stillExists = !!fetchedUpdates.projectUpdates.find((upd) => upd.uid === update.uid);
                break;
              }
              case "ProjectImpact": {
                const fetchedImpacts = await getProjectImpacts(projectIdOrSlug);
                stillExists = !!fetchedImpacts.find((imp) => imp.uid === update.uid);
                break;
              }
              case "GrantUpdate": {
                const fetchedGrants = await getProjectGrants(projectIdOrSlug);
                const grant = fetchedGrants.find(
                  (g) => g.uid.toLowerCase() === update.refUID.toLowerCase()
                );
                stillExists = !!grant?.updates?.find(
                  (grantUpdate) => grantUpdate.uid.toLowerCase() === update.uid.toLowerCase()
                );
                break;
              }
            }

            return !stillExists;
          },
          async () => {
            await refreshDataAfterDeletion();
            callbackFn?.();
          }
        );
      };

      if (!isOnChainAuthorized) {
        await performOffChainRevoke({
          uid: findUpdate?.uid as `0x${string}`,
          chainID: findUpdate.chainID,
          checkIfExists: checkIfAttestationExists,
          onSuccess: async () => {
            await refreshDataAfterDeletion();
          },
          toastMessages: {
            success: deleteMessage,
            loading: `Deleting ${update.type.toLowerCase()}...`,
          },
        });
      } else {
        try {
          const res = await findUpdate.revoke(walletSigner as any, changeStepperStep);
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, findUpdate.chainID), "POST", {});
          }

          await checkIfAttestationExists(() => {
            changeStepperStep("indexed");
          });
          showSuccess(deleteMessage);
          await refreshDataAfterDeletion();
        } catch (onChainError: any) {
          // Silently fallback to off-chain revoke
          dismiss(); // Reset toast since we're falling back

          const success = await performOffChainRevoke({
            uid: findUpdate?.uid as `0x${string}`,
            chainID: findUpdate.chainID,
            checkIfExists: checkIfAttestationExists,
            onSuccess: async () => {
              await refreshDataAfterDeletion();
            },
            toastMessages: {
              success: deleteMessage,
              loading: `Deleting ${update.type.toLowerCase()}...`,
            },
          });

          if (!success) {
            // Both methods failed - throw the original error to maintain expected behavior
            throw onChainError;
          }
        }
      }
    } catch (error: any) {
      const errorMessage =
        update.type === "ProjectUpdate"
          ? MESSAGES.PROJECT_UPDATE_FORM.DELETE.ERROR
          : update.type === "ProjectImpact"
            ? MESSAGES.PROJECT.IMPACT.REMOVE.ERROR
            : MESSAGES.GRANT.GRANT_UPDATE.UNDO.ERROR;

      showError(errorMessage);
      errorManager(
        `Error deleting ${update.type.toLowerCase()} ${update.uid} from project ${project?.uid}`,
        error
      );
    } finally {
      setIsDeletingUpdate(false);
      dismiss();
    }
  };

  // Keep legacy function name for backward compatibility
  const deleteProjectUpdate = deleteUpdate;

  const getShareText = () => {
    const shareDictionary = {
      ProjectUpdate: SHARE_TEXTS.PROJECT_ACTIVITY(
        project?.details?.title as string,
        (project?.details?.slug || project?.uid) as string
      ),
      GrantUpdate: SHARE_TEXTS.GRANT_UPDATE(
        project?.details?.title as string,
        (project?.details?.slug || project?.uid) as string,
        update.uid
      ),
      ProjectMilestone: SHARE_TEXTS.GRANT_UPDATE(
        project?.details?.title as string,
        (project?.details?.slug || project?.uid) as string,
        update.uid
      ),
      ProjectImpact: SHARE_TEXTS.PROJECT_ACTIVITY(
        project?.details?.title as string,
        (project?.details?.slug || project?.uid) as string
      ),
      Milestone: SHARE_TEXTS.PROJECT_ACTIVITY(
        project?.details?.title as string,
        (project?.details?.slug || project?.uid) as string
      ),
    };

    return shareDictionary[update.type as keyof typeof shareDictionary];
  };

  const handleShare = () => {
    const shareText = getShareText();
    if (shareText) {
      window.open(shareOnX(shareText), "_blank");
    }
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
  };

  return {
    isDeletingUpdate,
    isEditDialogOpen,
    deleteUpdate,
    deleteProjectUpdate, // Keep for backward compatibility
    handleShare,
    handleEdit,
    closeEditDialog,
    canShare: !!getShareText(),
  };
};
