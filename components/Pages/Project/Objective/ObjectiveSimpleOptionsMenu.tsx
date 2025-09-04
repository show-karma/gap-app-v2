"use client";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { useWallet } from "@/hooks/useWallet";
import { useOwnerStore, useProjectStore } from "@/store";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { getProjectById } from "@/utilities/sdk";
import { cn } from "@/utilities/tailwind";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { TrashIcon } from "@heroicons/react/24/outline";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";

const DeleteDialog = dynamic(() =>
  import("@/components/DeleteDialog").then((mod) => mod.DeleteDialog)
);

const buttonClassName = `group border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 dark:hover:opacity-75 hover:opacity-75 flex w-full items-start justify-start rounded-md px-2 py-2 text-sm flex-row gap-2`;

interface ObjectiveSimpleOptionsMenuProps {
  objectiveId: string;
}

export const ObjectiveSimpleOptionsMenu = ({
  objectiveId,
}: ObjectiveSimpleOptionsMenuProps) => {
  const params = useParams();
  const projectId = params.projectId as string;
  const [isDeleting, setIsDeleting] = useState(false);
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { project, isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { performOffChainRevoke } = useOffChainRevoke();

  const { refetch } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(projectId),
  });

  const deleteFn = async () => {
    if (!address || !project) return;
    let gapClient = gap;
    setIsDeleting(true);
    try {
      const { success, chainId: actualChainId, gapClient: newGapClient } = await ensureCorrectChain({
        targetChainId: project.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsDeleting(false);
        return;
      }

      gapClient = newGapClient;

      const { walletClient, error } = await safeGetWalletClient(
        actualChainId
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await getProjectById(projectId);
      if (!fetchedProject) return;
      const fetchedMilestones = await gapIndexerApi
        .projectMilestones(projectId)
        .then((res) => res.data);
      if (!fetchedMilestones || !gapClient?.network) return;
      const objectivesInstances = ProjectMilestone.from(
        fetchedMilestones,
        gapClient?.network
      );
      const objectiveInstance = objectivesInstances.find(
        (item) => item.uid.toLowerCase() === objectiveId.toLowerCase()
      );
      if (!objectiveInstance) return;

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedObjectives = await getProjectObjectives(projectId);
            const stillExists = fetchedObjectives.find(
              (item) => item.uid.toLowerCase() === objectiveId.toLowerCase()
            );

            return !stillExists;
          },
          async () => {
            callbackFn?.();
            await refetch();
          }
        );
      };

      if (!isOnChainAuthorized) {
        await performOffChainRevoke({
          uid: objectiveInstance?.uid as `0x${string}`,
          chainID: objectiveInstance.chainID,
          checkIfExists: checkIfAttestationExists,
          toastMessages: {
            success: MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.SUCCESS,
            loading: MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.LOADING,
          },
        });
      } else {
        try {
          const res = await objectiveInstance.revoke(walletSigner, changeStepperStep);
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, objectiveInstance.chainID),
              "POST",
              {}
            );
          }
          await checkIfAttestationExists(() => {
            changeStepperStep("indexed");
          });
          toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.SUCCESS);
        } catch (onChainError: any) {
          // Silently fallback to off-chain revoke
          setIsStepper(false); // Reset stepper since we're falling back
          
          const success = await performOffChainRevoke({
            uid: objectiveInstance?.uid as `0x${string}`,
            chainID: objectiveInstance.chainID,
            checkIfExists: checkIfAttestationExists,
            toastMessages: {
              success: MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.SUCCESS,
              loading: MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.LOADING,
            },
          });
          
          if (!success) {
            // Both methods failed - throw the original error to maintain expected behavior
            throw onChainError;
          }
        }
      }
    } catch (error: any) {
      console.log(error);
      toast.error(MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.ERROR);
      errorManager(`Error deleting objective ${objectiveId}`, error, {
        project: projectId,
        objective: objectiveId,
      });
      setIsStepper(false);
    } finally {
      setIsDeleting(false);
      setIsStepper(false);
    }
  };

  return (
    <DeleteDialog
      title="Are you sure you want to delete this milestone?"
      deleteFunction={deleteFn}
      isLoading={isDeleting}
      buttonElement={{
        icon: (
          <TrashIcon
            className={"h-5 w-5 text-[#D92D20] dark:text-red-500"}
            aria-hidden="true"
          />
        ),
        text: "",
        styleClass: cn(
          buttonClassName,
          "text-[#D92D20] dark:text-red-500 w-max p-0"
        ),
      }}
    />
  );
};
