"use client";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { gapIndexerClient } from "@/utilities/gapIndexerClient";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { deleteProject, getProjectById } from "@/utilities/sdk";
import { cn } from "@/utilities/tailwind";
import { config } from "@/utilities/wagmi/config";
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownOnSquareIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  LightBulbIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  ChevronDownIcon,
  EllipsisVerticalIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import { getWalletClient } from "@wagmi/core";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";

const DeleteDialog = dynamic(() =>
  import("@/components/DeleteDialog").then((mod) => mod.DeleteDialog)
);

const buttonClassName = `group border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 dark:hover:opacity-75 hover:opacity-75 flex w-full items-start justify-start rounded-md px-2 py-2 text-sm flex-row gap-2`;

interface ObjectiveOptionsMenuProps {
  objectiveId: string;
}

const EditIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clip-path="url(#clip0_4474_13318)">
      <path
        d="M9.16699 3.33027H5.66699C4.26686 3.33027 3.5668 3.33027 3.03202 3.60275C2.56161 3.84244 2.17916 4.22489 1.93948 4.69529C1.66699 5.23007 1.66699 5.93014 1.66699 7.33027V14.3303C1.66699 15.7304 1.66699 16.4305 1.93948 16.9652C2.17916 17.4356 2.56161 17.8181 3.03202 18.0578C3.5668 18.3303 4.26686 18.3303 5.66699 18.3303H12.667C14.0671 18.3303 14.7672 18.3303 15.302 18.0578C15.7724 17.8181 16.1548 17.4356 16.3945 16.9652C16.667 16.4305 16.667 15.7304 16.667 14.3303V10.8303M6.66697 13.3303H8.06242C8.47007 13.3303 8.6739 13.3303 8.86571 13.2842C9.03577 13.2434 9.19835 13.176 9.34747 13.0847C9.51566 12.9816 9.65979 12.8375 9.94804 12.5492L17.917 4.58027C18.6073 3.88991 18.6073 2.77062 17.917 2.08027C17.2266 1.38991 16.1073 1.38991 15.417 2.08027L7.44802 10.0492C7.15977 10.3375 7.01564 10.4816 6.91257 10.6498C6.82119 10.7989 6.75385 10.9615 6.71302 11.1315C6.66697 11.3234 6.66697 11.5272 6.66697 11.9348V13.3303Z"
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
}: ObjectiveOptionsMenuProps) => {
  const { project } = useProjectStore();
  const params = useParams();
  const projectId = params.projectId as string;
  const [isDeleting, setIsDeleting] = useState(false);
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const router = useRouter();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const uidOrSlug = useParams().projectId as string;

  const { refetch } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(uidOrSlug),
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
      const walletClient = await getWalletClient(config, {
        chainId: project.chainID,
      });
      if (!walletClient) return;
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
      await objectiveInstance
        .revoke(walletSigner, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedObjectives = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, objectiveInstance.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            fetchedObjectives = await getProjectObjectives(projectId);
            const stillExists = fetchedObjectives.find(
              (item) => item.uid.toLowerCase() === objectiveId.toLowerCase()
            );

            if (!stillExists) {
              retries = 0;
              changeStepperStep("indexed");
              toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.DELETE.SUCCESS);
              await refetch();
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
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

  const markAsCompleted = async () => {
    if (!address || !project) return;
    let gapClient = gap;
    try {
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: project.chainID,
      });
      if (!walletClient) return;
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
      await objectiveInstance
        .complete(
          walletSigner,
          {
            type: `project-milestone-completed`,
          },
          changeStepperStep
        )
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedObjectives = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, objectiveInstance.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            fetchedObjectives = await getProjectObjectives(projectId);
            const isCompleted = fetchedObjectives.find(
              (item) => item.uid.toLowerCase() === objectiveId.toLowerCase()
            )?.completed;

            if (isCompleted) {
              retries = 0;
              changeStepperStep("indexed");
              toast.success(MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.SUCCESS);
              await refetch();
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      console.log(error);
      toast.error(MESSAGES.PROJECT_OBJECTIVE_FORM.COMPLETE.ERROR);
      errorManager(`Error completing objective ${objectiveId}`, error, {
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
    <>
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="w-max bg-transparent hover:bg-zinc-100 hover:dark:bg-zinc-800 text-black dark:text-white p-0 rounded-lg">
            <EllipsisVerticalIcon
              className="h-6 w-6 text-zinc-500"
              aria-hidden="true"
            />
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
            <div className="flex flex-col gap-1 px-1 py-1">
              <Menu.Item>
                <Button className={buttonClassName}>
                  <EditIcon />
                  Edit
                </Button>
              </Menu.Item>
              <Menu.Item>
                <Button className={buttonClassName} onClick={markAsCompleted}>
                  <CheckCircleIcon className="w-5 h-5" />
                  Mark as Complete
                </Button>
              </Menu.Item>
              <Menu.Item>
                <DeleteDialog
                  title="Are you sure you want to delete this objective?"
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
                    styleClass: cn(
                      buttonClassName,
                      "text-[#D92D20] dark:text-red-500"
                    ),
                  }}
                />
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  );
};
