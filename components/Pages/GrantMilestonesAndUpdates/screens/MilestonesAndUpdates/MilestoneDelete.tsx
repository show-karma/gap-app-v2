import { DeleteDialog } from "@/components/DeleteDialog";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useOwnerStore, useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { config } from "@/utilities/wagmi/config";
import { TrashIcon } from "@heroicons/react/24/outline";
import { IMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { type FC, useState } from "react";
import toast from "react-hot-toast";

import { errorManager } from "@/components/Utilities/errorManager";
import { retryUntilConditionMet } from "@/utilities/retries";
import { useWallet } from "@/hooks/useWallet";
interface MilestoneDeleteProps {
  milestone: IMilestoneResponse;
}

export const MilestoneDelete: FC<MilestoneDeleteProps> = ({ milestone }) => {
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);

  const { chain, address, switchChainAsync } = useWallet();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const selectedProject = useProjectStore((state) => state.project);

  const { project, isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;

  const deleteFn = async () => {
    setIsDeletingMilestone(true);
    let gapClient = gap;
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchChainAsync?.({ chainId: milestone.chainID });
        gapClient = getGapClient(milestone.chainID);
      }
      const milestoneUID = milestone.uid;

      const { walletClient, error } = await safeGetWalletClient(
        milestone.chainID
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === milestone.refUID.toLowerCase()
      );
      if (!grantInstance) return;
      const milestoneInstance = grantInstance.milestones.find(
        (item) => item.uid.toLowerCase() === milestone.uid.toLowerCase()
      );
      if (!milestoneInstance) return;

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedProject = await refreshProject();
            const grant = fetchedProject?.grants.find(
              (g) => g.uid === milestone.refUID
            );
            const stillExists = grant?.milestones.find(
              (m) => m.uid === milestoneUID
            );
            return !stillExists && !!grant?.milestones;
          },
          () => {
            callbackFn?.();
          }
        );
      };
      if (!isOnChainAuthorized) {
        const toastLoading = toast.loading(MESSAGES.MILESTONES.DELETE.LOADING);
        await fetchData(
          INDEXER.PROJECT.REVOKE_ATTESTATION(
            milestoneInstance?.uid as `0x${string}`,
            milestoneInstance.chainID
          ),
          "POST",
          {}
        )
          .then(async () => {
            await checkIfAttestationExists()
              .then(() => {
                toast.success(MESSAGES.MILESTONES.DELETE.SUCCESS, {
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
        await milestoneInstance
          .revoke(walletSigner, changeStepperStep)
          .then(async (res) => {
            changeStepperStep("indexing");
            const txHash = res?.tx[0]?.hash;
            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
                "POST",
                {}
              );
            }
            await checkIfAttestationExists(() => {
              changeStepperStep("indexed");
            }).then(() => {
              toast.success(MESSAGES.MILESTONES.DELETE.SUCCESS);
            });
          });
      }
    } catch (error: any) {
      errorManager(
        MESSAGES.MILESTONES.DELETE.ERROR(milestone.data.title),
        error,
        {
          milestone: milestone.uid,
          grant: milestone.refUID,
          address: address,
        },
        { error: MESSAGES.MILESTONES.DELETE.ERROR(milestone.data.title) }
      );
    } finally {
      setIsDeletingMilestone(false);
      setIsStepper(false);
    }
  };

  return (
    <DeleteDialog
      deleteFunction={deleteFn}
      isLoading={isDeletingMilestone}
      title={
        <p className="font-normal">
          Are you sure you want to delete <b>{milestone.data.title}</b>{" "}
          milestone?
        </p>
      }
      buttonElement={{
        text: "",
        icon: <TrashIcon className="text-red-500 w-5 h-5" />,
        styleClass:
          "bg-transparent p-0 w-max h-max text-red-500 hover:bg-transparent",
      }}
    />
  );
};
