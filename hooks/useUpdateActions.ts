import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import toast from "react-hot-toast";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useOwnerStore, useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { errorManager } from "@/components/Utilities/errorManager";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";
import {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

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
  const { switchChainAsync } = useSwitchChain();
  const { project, isProjectOwner } = useProjectStore();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isOnChainAuthorized = isProjectOwner || isOwner;

  const deleteProjectUpdate = async () => {
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

      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      if (!instanceProject) {
        throw new Error("Project not found");
      }
      const findUpdate = instanceProject.updates.find(
        (upd) => upd.uid === update.uid
      );
      if (!findUpdate) {
        throw new Error("Update not found");
      }

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedProject = await refreshProject();

            const stillExists = fetchedProject?.updates?.find(
              (upd) => ((upd as any)?._uid || upd.uid) === update.uid
            );
            return !stillExists;
          },
          () => {
            callbackFn?.();
          }
        );
      };

      if (!isOnChainAuthorized) {
        const toastLoading = toast.loading(
          MESSAGES.PROJECT_UPDATE_FORM.DELETE.LOADING
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
            checkIfAttestationExists()
              .then(() => {
                toast.success(MESSAGES.PROJECT_UPDATE_FORM.DELETE.SUCCESS, {
                  id: toastLoading,
                });
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
          .then(async (res) => {
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
            }).then(() => {
              toast.success(MESSAGES.PROJECT_UPDATE_FORM.DELETE.SUCCESS);
            });
          });
      }
    } catch (error: any) {
      console.log(error);
      toast.error(MESSAGES.PROJECT_UPDATE_FORM.DELETE.ERROR);
      errorManager(
        `Error deleting project activity ${update.uid} from project ${project?.uid}`,
        error
      );
    } finally {
      setIsDeletingUpdate(false);
      setIsStepper(false);
    }
  };

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
    deleteProjectUpdate,
    handleShare,
    handleEdit,
    closeEditDialog,
    canShare: !!getShareText(),
  };
};
