import { useState } from "react";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/features/projects/lib/store";
import { useOwnerStore } from "@/features/contract-owner/lib/owner";
import { useStepper } from "@/features/modals/lib/stores/txStepper";
import { checkNetworkIsValid } from "@/lib/web3/network-validation";
import { walletClientToSigner } from "@/lib/web3/eas-wagmi-utils";
import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";
import { MESSAGES } from "@/config/messages";
import { retryUntilConditionMet } from "@/lib/utils/retries";
import { safeGetWalletClient } from "@/lib/utils/wallet-helpers";
import { errorManager } from "@/lib/utils/error-manager";
import { shareOnX } from "@/features/share/lib/shareOnX";
import { SHARE_TEXTS } from "@/features/share/lib/text";
import { queryClient } from "@/components/providers/wagmi-provider";
import { useParams, useRouter } from "next/navigation";
import {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useWallet } from "@/features/auth/hooks/use-wallet";

type UpdateType =
  | IProjectUpdate
  | IGrantUpdate
  | IMilestoneResponse
  | IProjectImpact
  | IProjectMilestoneResponse;

export const useUpdateActions = (update: UpdateType) => {
  const [isDeletingUpdate, setIsDeletingUpdate] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { changeStepperStep, setIsStepper } = useStepper();
  const { gap } = useGap();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { project, isProjectOwner } = useProjectStore();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isOnChainAuthorized = isProjectOwner || isOwner;
  const projectId = useParams().projectId as string;
  const router = useRouter();

  // Function to refresh data after successful deletion
  const refreshDataAfterDeletion = async () => {
    try {
      // Invalidate all relevant query caches
      await Promise.all([
        // Milestone-related queries
        queryClient.invalidateQueries({
          queryKey: ["all-milestones", projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["projectMilestones", project?.uid],
        }),
        // Project-related queries
        queryClient.invalidateQueries({
          queryKey: ["project", project?.uid],
        }),
        queryClient.invalidateQueries({
          queryKey: ["project", project?.details?.data?.slug],
        }),
        // Community feed queries (if any)
        queryClient.invalidateQueries({
          queryKey: ["communityFeed"],
        }),
        // Refresh the project data from the store
        refreshProject(),
      ]);

      // Force a router refresh to update components that use direct API calls
      // This will refresh the ProjectFeed component which doesn't use React Query
      router.refresh();
    } catch (error) {
      console.warn("Failed to refresh data after deletion:", error);
    }
  };

  const deleteUpdate = async () => {
    let gapClient = gap;
    try {
      setIsDeletingUpdate(true);
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== update.chainID) {
        await switchChainAsync?.({ chainId: update.chainID });
        gapClient = getGapClient(update.chainID);
      }

      const { walletClient, error } = await safeGetWalletClient(update.chainID);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);

      let findUpdate: any = null;
      let deleteMessage = "";
      let deleteErrorMessage = "";

      // Handle different update types
      switch (update.type) {
        case "ProjectUpdate": {
          const instanceProject = await gapClient.fetch.projectById(
            project?.uid
          );
          if (!instanceProject) throw new Error("Project not found");

          findUpdate = instanceProject.updates.find(
            (upd) => upd.uid === update.uid
          );
          if (!findUpdate) throw new Error("Project update not found");

          deleteMessage = MESSAGES.PROJECT_UPDATE_FORM.DELETE.SUCCESS;
          deleteErrorMessage = MESSAGES.PROJECT_UPDATE_FORM.DELETE.ERROR;
          break;
        }

        case "ProjectImpact": {
          const instanceProject = await gapClient.fetch.projectById(
            project?.uid
          );
          if (!instanceProject) throw new Error("Project not found");

          findUpdate = instanceProject.impacts?.find(
            (impact) => impact.uid === update.uid
          );
          if (!findUpdate) throw new Error("Project impact not found");

          deleteMessage = MESSAGES.PROJECT.IMPACT.REMOVE.SUCCESS;
          deleteErrorMessage = MESSAGES.PROJECT.IMPACT.REMOVE.ERROR;
          break;
        }

        case "GrantUpdate": {
          const instanceProject = await gapClient.fetch.projectById(
            project?.uid
          );
          if (!instanceProject) throw new Error("Project not found");

          const grantInstance = instanceProject.grants.find(
            (grant) => grant.uid.toLowerCase() === update.refUID.toLowerCase()
          );
          if (!grantInstance) throw new Error("Grant not found");

          findUpdate = grantInstance.updates.find(
            (grantUpdate) =>
              grantUpdate.uid.toLowerCase() === update.uid.toLowerCase()
          );
          if (!findUpdate) throw new Error("Grant update not found");

          deleteMessage = MESSAGES.GRANT.GRANT_UPDATE.UNDO.SUCCESS;
          deleteErrorMessage = MESSAGES.GRANT.GRANT_UPDATE.UNDO.ERROR;
          break;
        }

        default:
          throw new Error(`Unsupported update type: ${update.type}`);
      }

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedProject = await refreshProject();
            let stillExists = false;

            switch (update.type) {
              case "ProjectUpdate":
                stillExists = !!fetchedProject?.updates?.find(
                  (upd) => ((upd as any)?._uid || upd.uid) === update.uid
                );
                break;
              case "ProjectImpact":
                stillExists = !!fetchedProject?.impacts?.find(
                  (impact) => impact.uid === update.uid
                );
                break;
              case "GrantUpdate":
                const grant = fetchedProject?.grants?.find(
                  (grant) =>
                    grant.uid.toLowerCase() === update.refUID.toLowerCase()
                );
                stillExists = !!grant?.updates?.find(
                  (grantUpdate) =>
                    grantUpdate.uid.toLowerCase() === update.uid.toLowerCase()
                );
                break;
            }

            return !stillExists;
          },
          () => {
            callbackFn?.();
          }
        );
      };

      if (!isOnChainAuthorized) {
        const toastLoading = toast.loading(
          `Deleting ${update.type.toLowerCase()}...`
        );
        await fetchData(
          INDEXER.PROJECT.REVOKE_ATTESTATION(
            findUpdate?.uid as `0x${string}`,
            findUpdate.chainID
          ),
          "POST",
          {}
        )
          .then(async () => {
            await checkIfAttestationExists()
              .then(async () => {
                toast.success(deleteMessage, {
                  id: toastLoading,
                });
                // Refresh data after successful deletion
                await refreshDataAfterDeletion();
              })
              .catch(() => {
                toast.dismiss(toastLoading);
              });
          })
          .catch(() => {
            toast.dismiss(toastLoading);
          });
      } else {
        await findUpdate
          .revoke(walletSigner as any, changeStepperStep)
          .then(async (res: any) => {
            const txHash = res?.tx[0]?.hash;
            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, findUpdate.chainID),
                "POST",
                {}
              );
            }

            await checkIfAttestationExists(() => {
              changeStepperStep("indexed");
            }).then(async () => {
              toast.success(deleteMessage);
              // Refresh data after successful deletion
              await refreshDataAfterDeletion();
            });
          });
      }
    } catch (error: any) {
      console.log(error);
      const errorMessage =
        update.type === "ProjectUpdate"
          ? MESSAGES.PROJECT_UPDATE_FORM.DELETE.ERROR
          : update.type === "ProjectImpact"
          ? MESSAGES.PROJECT.IMPACT.REMOVE.ERROR
          : MESSAGES.GRANT.GRANT_UPDATE.UNDO.ERROR;

      toast.error(errorMessage);
      errorManager(
        `Error deleting ${update.type.toLowerCase()} ${
          update.uid
        } from project ${project?.uid}`,
        error
      );
    } finally {
      setIsDeletingUpdate(false);
      setIsStepper(false);
    }
  };

  // Keep legacy function name for backward compatibility
  const deleteProjectUpdate = deleteUpdate;

  const getShareText = () => {
    const shareDictionary = {
      ProjectUpdate: SHARE_TEXTS.PROJECT_ACTIVITY(
        project?.details?.data?.title as string,
        project?.uid as string
      ),
      GrantUpdate: SHARE_TEXTS.GRANT_UPDATE(
        project?.details?.data?.title as string,
        project?.uid as string,
        update.uid
      ),
      ProjectMilestone: SHARE_TEXTS.GRANT_UPDATE(
        project?.details?.data?.title as string,
        project?.uid as string,
        update.uid
      ),
      ProjectImpact: SHARE_TEXTS.PROJECT_ACTIVITY(
        project?.details?.data?.title as string,
        project?.uid as string
      ),
      Milestone: SHARE_TEXTS.PROJECT_ACTIVITY(
        project?.details?.data?.title as string,
        project?.uid as string
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
