"use client";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks";
import { useOwnerStore, useProjectStore } from "@/store";
import { useGrantGenieModalStore } from "@/store/modals/genie";
import { useMergeModalStore } from "@/store/modals/merge";
import { useProjectEditModalStore } from "@/store/modals/projectEdit";
import { useTransferOwnershipModalStore } from "@/store/modals/transferOwnership";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { deleteProject, getProjectById } from "@/utilities/sdk";

import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownOnSquareIcon,
  ArrowsRightLeftIcon,
  LightBulbIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { EllipsisVerticalIcon, PlusIcon } from "@heroicons/react/24/solid";

import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { LinkContractAddressButton } from "./LinkContractAddressButton";
import { LinkGithubRepoButton } from "./LinkGithubRepoButton";

import { LinkOSOProfileButton } from "./LinkOSOProfileButton";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useContactInfo } from "@/hooks/useContactInfo";

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog/EditProjectDialog").then(
      (mod) => mod.EditProjectDialog
    ),
  { ssr: false }
);
const GrantsGenieDialog = dynamic(
  () =>
    import("@/components/Dialogs/GrantGenieDialog").then(
      (mod) => mod.GrantsGenieDialog
    ),
  { ssr: false }
);

const DeleteDialog = dynamic(() =>
  import("@/components/DeleteDialog").then((mod) => mod.DeleteDialog)
);

const TransferOwnershipDialog = dynamic(() =>
  import("@/components/Dialogs/TransferOwnershipDialog").then(
    (mod) => mod.TransferOwnershipDialog
  )
);
const MergeProjectDialog = dynamic(() =>
  import("@/components/Dialogs/MergeProjectDialog").then(
    (mod) => mod.MergeProjectDialog
  )
);

const buttonClassName = `group border-none ring-none font-normal bg-transparent dark:bg-transparent text-gray-900 dark:text-zinc-100 dark:hover:bg-brand-blue dark:hover:opacity-100 dark:hover:text-white hover:bg-brand-blue hover:opacity-100 hover:text-white flex w-full items-start justify-start rounded-md px-2 py-2 text-sm`;

export const ProjectOptionsMenu = () => {
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
  const { isProjectEditModalOpen, openProjectEditModal } =
    useProjectEditModalStore();
  const { isMergeModalOpen, openMergeModal } = useMergeModalStore();
  const { openGrantGenieModal, isGrantGenieModalOpen } =
    useGrantGenieModalStore();
  const { isTransferOwnershipModalOpen, openTransferOwnershipModal } =
    useTransferOwnershipModalStore();
  const { isProjectOwner } = useProjectStore();
  const { data: contactsInfo } = useContactInfo(projectId);
  const { isOwner: isContractOwner } = useOwnerStore();
  const isAuthorized = isProjectOwner || isContractOwner;

  const deleteFn = async () => {
    if (!address || !project) return;
    setIsDeleting(true);
    try {
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
      }

      const { walletClient, error } = await safeGetWalletClient(
        project.chainID,
        true,
        setIsDeleting
      );

      if (error || !walletClient) {
        return;
      }

      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await getProjectById(projectId);
      if (!fetchedProject) return;
      await deleteProject(
        fetchedProject,
        walletSigner,
        gap,
        router,
        changeStepperStep
      ).then(async () => {
        toast.success(MESSAGES.PROJECT.DELETE.SUCCESS);
      });
    } catch (error: any) {
      console.log(error);
      toast.error(MESSAGES.PROJECT.DELETE.ERROR);
      errorManager(`Error deleting project ${projectId}`, error);
      setIsStepper(false);
    } finally {
      setIsDeleting(false);
      setIsStepper(false);
    }
  };

  return (
    <>
      {isProjectEditModalOpen ? (
        <ProjectDialog
          key={project?.uid}
          buttonElement={null}
          projectToUpdate={project}
          previousContacts={contactsInfo}
        />
      ) : null}
      {isMergeModalOpen ? <MergeProjectDialog buttonElement={null} /> : null}
      {isGrantGenieModalOpen ? <GrantsGenieDialog /> : null}
      {isTransferOwnershipModalOpen ? (
        <TransferOwnershipDialog buttonElement={null} />
      ) : null}
      <Menu as="div" className={`relative inline-block text-left z-10`}>
        <div>
          <Menu.Button className="w-max bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 hover:dark:bg-zinc-800 text-black dark:text-white p-2 rounded-lg">
            <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
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
            className="z-[10000] absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 focus:outline-none"
          >
            <div className="flex flex-col gap-1 px-1 py-1">
              <Menu.Item>
                <button
                  type="button"
                  onClick={openProjectEditModal}
                  className={buttonClassName}
                >
                  <PencilSquareIcon
                    className={"mr-2 h-5 w-5"}
                    aria-hidden="true"
                  />
                  Edit project
                </button>
              </Menu.Item>
              {isAuthorized ? (
                <Menu.Item>
                  <button
                    type="button"
                    onClick={openMergeModal}
                    className={buttonClassName}
                  >
                    <ArrowDownOnSquareIcon
                      className={"mr-2 h-5 w-5"}
                      aria-hidden="true"
                    />
                    Merge
                  </button>
                </Menu.Item>
              ) : null}
              {isAuthorized ? (
                <Menu.Item>
                  <button
                    type="button"
                    onClick={openTransferOwnershipModal}
                    className={buttonClassName}
                  >
                    <ArrowsRightLeftIcon
                      className={"mr-2 h-5 w-5"}
                      aria-hidden="true"
                    />
                    Transfer ownership
                  </button>
                </Menu.Item>
              ) : null}
              {isAuthorized ? (
                <Menu.Item>
                  <LinkContractAddressButton
                    buttonClassName={buttonClassName}
                    project={
                      project as IProjectResponse & {
                        external: Record<string, string[]>;
                      }
                    }
                  />
                </Menu.Item>
              ) : null}
              {isAuthorized ? (
                <Menu.Item>
                  <LinkGithubRepoButton
                    buttonClassName={buttonClassName}
                    project={
                      project as IProjectResponse & {
                        external: Record<string, string[]>;
                      }
                    }
                  />
                </Menu.Item>
              ) : null}
              {isAuthorized ? (
                <Menu.Item>
                  <LinkOSOProfileButton
                    buttonClassName={buttonClassName}
                    project={
                      project as IProjectResponse & {
                        external: Record<string, string[]>;
                      }
                    }
                  />
                </Menu.Item>
              ) : null}
              <Menu.Item>
                <Link
                  href={PAGES.PROJECT.IMPACT.ADD_IMPACT(
                    project?.details?.data?.slug || projectId
                  )}
                  className={buttonClassName}
                >
                  <PlusIcon className={"mr-2 h-5 w-5"} aria-hidden="true" />
                  Add impact
                </Link>
              </Menu.Item>
              <Menu.Item>
                <button
                  type="button"
                  onClick={openGrantGenieModal}
                  className={buttonClassName}
                >
                  <LightBulbIcon className="h-5 w-5 mr-2" />
                  Grant genie
                </button>
              </Menu.Item>
              {isAuthorized ? (
                <Menu.Item>
                  <DeleteDialog
                    title="Are you sure you want to delete this project?"
                    deleteFunction={deleteFn}
                    isLoading={isDeleting}
                    buttonElement={{
                      icon: (
                        <TrashIcon
                          className={"mr-2 h-5 w-5"}
                          aria-hidden="true"
                        />
                      ),
                      text: "Delete project",
                      styleClass: buttonClassName,
                    }}
                  />
                </Menu.Item>
              ) : null}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  );
};
