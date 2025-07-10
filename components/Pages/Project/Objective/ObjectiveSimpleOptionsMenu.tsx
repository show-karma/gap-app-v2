"use client";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useProjectQuery } from "@/hooks/useProjectQuery";
import { useWallet } from "@/hooks/useWallet";
import { useOwnerStore } from "@/store";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useStepper } from "@/store/modals/txStepper";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { getProjectById } from "@/utilities/sdk";
import { cn } from "@/utilities/tailwind";

import { Menu, Transition } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import toast from "react-hot-toast";

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
  const { address, chain, switchChainAsync, getSigner } = useWallet();
  const router = useRouter();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { isProjectOwner } = useProjectPermissions();
  const { data: project } = useProjectQuery();
  const { isOwner: isContractOwner } = useOwnerStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;

  const { refetch } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(projectId),
  });

  const deleteFn = async () => {
    if (!address || !project) return;
    let gapClient = gap;
    setIsDeleting(true);
    try {
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }

      if (!gapClient) {
        throw new Error("Failed to get gap client");
      }
      const walletSigner = await getSigner(project.chainID);
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
        const toastLoading = toast.loading(
          MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.LOADING
        );
        await fetchData(
          INDEXER.PROJECT.REVOKE_ATTESTATION(
            objectiveInstance?.uid as `0x${string}`,
            objectiveInstance.chainID
          ),
          "POST",
          {}
        )
          .then(async () => {
            checkIfAttestationExists()
              .then(() => {
                toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.SUCCESS, {
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
        await objectiveInstance
          .revoke(walletSigner, changeStepperStep)
          .then(async (res) => {
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
            }).then(() => {
              toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.SUCCESS);
            });
          });
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

  // return (
  //   <>
  //     <Menu as="div" className="relative inline-block text-left">
  //       <Menu.Button className="w-max bg-transparent hover:bg-zinc-100 hover:dark:bg-zinc-800 text-black dark:text-white p-0 rounded-lg">
  //         <EllipsisVerticalIcon
  //           className="h-6 w-6 text-zinc-500"
  //           aria-hidden="true"
  //         />
  //       </Menu.Button>
  //       <Transition
  //         as={Fragment}
  //         enter="transition ease-out duration-100"
  //         enterFrom="transform opacity-0 scale-95"
  //         enterTo="transform opacity-100 scale-100"
  //         leave="transition ease-in duration-75"
  //         leaveFrom="transform opacity-100 scale-100"
  //         leaveTo="transform opacity-0 scale-95"
  //       >
  //         <Menu.Items
  //           modal
  //           className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
  //         >
  //           <div className="flex flex-col gap-1 px-1 py-1">
  //             <DeleteDialog
  //               title="Are you sure you want to delete this milestone?"
  //               deleteFunction={deleteFn}
  //               isLoading={isDeleting}
  //               buttonElement={{
  //                 icon: (
  //                   <TrashIcon
  //                     className={"h-5 w-5 text-[#D92D20] dark:text-red-500"}
  //                     aria-hidden="true"
  //                   />
  //                 ),
  //                 text: "Delete",
  //                 styleClass: cn(
  //                   buttonClassName,
  //                   "text-[#D92D20] dark:text-red-500"
  //                 ),
  //               }}
  //             />
  //           </div>
  //         </Menu.Items>
  //       </Transition>
  //     </Menu>
  //   </>
  // );
};
