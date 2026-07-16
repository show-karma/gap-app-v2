"use client";
import { Menu, Transition } from "@headlessui/react";
import { CheckCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import type { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { useOwnerStore, useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { getProjectById } from "@/utilities/sdk";
import { cn } from "@/utilities/tailwind";

const DeleteDialog = dynamic(() =>
  import("@/components/DeleteDialog").then((mod) => mod.DeleteDialog)
);

const buttonClassName = `group border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 dark:hover:opacity-75 hover:opacity-75 flex w-full items-start justify-start rounded-md px-2 py-2 text-sm flex-row gap-2`;

interface ObjectiveOptionsMenuProps {
  objectiveId: string;
  completeFn: (completeState: boolean) => void;
  alreadyCompleted: boolean;
}

const _EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_4474_13318)">
      <path
        d="M9.17 3.33H5.67C4.27 3.33 3.57 3.33 3.03 3.6C2.56 3.84 2.18 4.22 1.94 4.7C1.67 5.23 1.67 5.93 1.67 7.33V14.33C1.67 15.73 1.67 16.43 1.94 16.97C2.18 17.44 2.56 17.82 3.03 18.06C3.57 18.33 4.27 18.33 5.67 18.33H12.67C14.07 18.33 14.77 18.33 15.3 18.06C15.77 17.82 16.15 17.44 16.39 16.97C16.67 16.43 16.67 15.73 16.67 14.33V10.83M6.67 13.33H8.06C8.47 13.33 8.67 13.33 8.87 13.28C9.04 13.24 9.2 13.18 9.35 13.08C9.52 12.98 9.66 12.84 9.95 12.55L17.92 4.58C18.61 3.89 18.61 2.77 17.92 2.08C17.23 1.39 16.11 1.39 15.42 2.08L7.45 10.05C7.16 10.34 7.02 10.48 6.91 10.65C6.82 10.8 6.75 10.96 6.71 11.13C6.67 11.32 6.67 11.53 6.67 11.93V13.33Z"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_4474_13318">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export const ObjectiveOptionsMenu = ({
  objectiveId,
  completeFn,
  alreadyCompleted,
}: ObjectiveOptionsMenuProps) => {
  const params = useParams();
  const projectId = params.projectId as string;
  const [isDeleting, setIsDeleting] = useState(false);
  const { chain, address } = useAccount();
  const { switchChainAsync } = useWallet();
  const _router = useRouter();
  const { startAttestation, showSuccess, showError, changeStepperStep, setIsStepper } =
    useAttestationToast();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const project = useProjectStore((state) => state.project);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { performOffChainRevoke } = useOffChainRevoke();

  const { refetch } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(projectId),
  });

  const deleteFn = async () => {
    if (!project) return;
    setIsDeleting(true);
    startAttestation("Deleting milestone...");
    try {
      const setup = await setupChainAndWallet({
        targetChainId: project.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        setIsDeleting(false);
        return;
      }

      const { gapClient, walletSigner } = setup;
      const fetchedProject = await getProjectById(projectId);
      if (!fetchedProject) return;
      const projectRecipient = fetchedProject.recipient;
      const fetchedMilestones = await getProjectObjectives(
        projectId,
        fetchedProject.uid,
        projectRecipient,
        fetchedProject.chainID
      );
      if (!fetchedMilestones || !gapClient?.network) return;
      const objectivesInstances = ProjectMilestone.from(fetchedMilestones, gapClient?.network);
      const objectiveInstance = objectivesInstances.find(
        (item) => item.uid.toLowerCase() === objectiveId.toLowerCase()
      );
      if (!objectiveInstance) return;

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedObjectives = await getProjectObjectives(
              projectId,
              fetchedProject.uid,
              projectRecipient,
              fetchedProject.chainID
            );
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
          showSuccess(MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.SUCCESS);
        } catch (onChainError) {
          // Silently fallback to off-chain revoke
          setIsStepper(false); // Reset stepper since we're falling back

          try {
            await performOffChainRevoke({
              uid: objectiveInstance?.uid as `0x${string}`,
              chainID: objectiveInstance.chainID,
              checkIfExists: checkIfAttestationExists,
              toastMessages: {
                success: MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.SUCCESS,
                loading: MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.LOADING,
              },
            });
          } catch {
            // Both methods failed - throw the original on-chain error to
            // preserve its context.
            throw onChainError;
          }
        }
      }
    } catch (error) {
      showError(MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.ERROR);
      errorManager(
        MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.ERROR,
        error,
        {
          project: projectId,
          objective: objectiveId,
          address,
        },
        { error: MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.ERROR }
      );
      setIsStepper(false);
    } finally {
      setIsDeleting(false);
      setIsStepper(false);
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="w-max bg-transparent hover:bg-zinc-100 hover:dark:bg-zinc-800 text-black dark:text-white p-0 rounded-lg">
          <EllipsisVerticalIcon className="h-6 w-6 text-zinc-500" aria-hidden="true" />
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          modal
          className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 focus:outline-none"
        >
          <div className="flex flex-col gap-1 p-1">
            <Menu.Item>
              <Button
                className={buttonClassName}
                onClick={() => completeFn(true)}
                disabled={alreadyCompleted}
              >
                <CheckCircleIcon className="w-5 h-5" />
                Mark as Complete
              </Button>
            </Menu.Item>
            <Menu.Item>
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
                  text: "Delete",
                  styleClass: cn(buttonClassName, "text-[#D92D20] dark:text-red-500"),
                }}
              />
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
