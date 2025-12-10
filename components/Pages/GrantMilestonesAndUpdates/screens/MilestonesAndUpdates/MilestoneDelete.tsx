import { TrashIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { DeleteDialog } from "@/components/DeleteDialog";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { useWallet } from "@/hooks/useWallet";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useOwnerStore, useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import type { GrantMilestone } from "@/types/v2/grant";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

interface MilestoneDeleteProps {
  milestone: GrantMilestone;
}

export const MilestoneDelete: FC<MilestoneDeleteProps> = ({ milestone }) => {
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);

  const { switchChainAsync } = useWallet();
  const { chain, address } = useAccount();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();

  const { project, isProjectOwner } = useProjectStore();
  const { refetch: refetchGrants } = useProjectGrants(project?.uid || "");
  const { isOwner: isContractOwner } = useOwnerStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { performOffChainRevoke } = useOffChainRevoke();

  const deleteFn = async () => {
    console.log("deleteFn", milestone.chainID);
    setIsDeletingMilestone(true);
    let gapClient = gap;
    try {
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: milestone.chainID || 0,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsDeletingMilestone(false);
        return;
      }

      gapClient = newGapClient;
      const milestoneUID = milestone.uid;

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      if (!walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet or gap client");
      }
      const walletSigner = await walletClientToSigner(walletClient);
      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === (milestone.refUID?.toLowerCase() ?? "")
      );
      if (!grantInstance) throw new Error("Grant not found");
      const milestoneInstance = grantInstance.milestones.find(
        (item) => item.uid.toLowerCase() === milestone.uid.toLowerCase()
      );
      if (!milestoneInstance) throw new Error("Milestone not found");

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const { data: fetchedGrants } = await refetchGrants();
            const grant = (fetchedGrants || []).find((g) => g.uid === milestone.refUID);
            const stillExists = grant?.milestones?.find((m) => m.uid === milestoneUID);
            return !stillExists && !!grant?.milestones;
          },
          () => {
            callbackFn?.();
          }
        );
      };
      if (!isOnChainAuthorized) {
        await performOffChainRevoke({
          uid: milestoneInstance.uid,
          chainID: milestoneInstance.chainID,
          onError: (error) => {
            errorManager(
              MESSAGES.MILESTONES.DELETE.ERROR(milestone.title || "Milestone"),
              error,
              {
                milestone: milestone.uid,
                grant: milestone.refUID,
                address: address,
              },
              {
                error: MESSAGES.MILESTONES.DELETE.ERROR(milestone.title || "Milestone"),
              }
            );
          },
          onSuccess: () => {
            changeStepperStep("indexed");
          },
          toastMessages: {
            success: MESSAGES.MILESTONES.DELETE.SUCCESS,
            loading: MESSAGES.MILESTONES.DELETE.LOADING,
          },
          checkIfExists: checkIfAttestationExists,
        });
      } else {
        try {
          const res = await milestoneInstance.revoke(walletSigner, changeStepperStep);
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
          });
          toast.success(MESSAGES.MILESTONES.DELETE.SUCCESS);
        } catch (onChainError: any) {
          // Silently fallback to off-chain revoke
          setIsStepper(false); // Reset stepper since we're falling back

          const success = await performOffChainRevoke({
            uid: milestoneInstance.uid as `0x${string}`,
            chainID: milestoneInstance.chainID,
            checkIfExists: checkIfAttestationExists,
            toastMessages: {
              success: MESSAGES.MILESTONES.DELETE.SUCCESS,
              loading: MESSAGES.MILESTONES.DELETE.LOADING,
            },
          });

          if (!success) {
            // Both methods failed - throw the original error to maintain expected behavior
            throw onChainError;
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      errorManager(
        MESSAGES.MILESTONES.DELETE.ERROR(milestone.title || "Milestone"),
        error,
        {
          milestone: milestone.uid,
          grant: milestone.refUID,
          address: address,
        },
        {
          error: MESSAGES.MILESTONES.DELETE.ERROR(milestone.title || "Milestone"),
        }
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
          Are you sure you want to delete <b>{milestone.title}</b> milestone?
        </p>
      }
      buttonElement={{
        text: "",
        icon: <TrashIcon className="text-red-500 w-5 h-5" />,
        styleClass: "bg-transparent p-0 w-max h-max text-red-500 hover:bg-transparent",
      }}
    />
  );
};
