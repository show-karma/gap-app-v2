"use client";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
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
import { useDynamicWallet } from "@/hooks/useDynamicWallet";
import { getWalletSignerWithAA } from "@/utilities/wallet-helpers";

import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownOnSquareIcon,
  ArrowsRightLeftIcon,
  FingerPrintIcon,
  LightBulbIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { EllipsisVerticalIcon, PlusIcon } from "@heroicons/react/24/solid";

import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { LinkContractAddressButton } from "./LinkContractAddressButton";
import { LinkGithubRepoButton } from "./LinkGithubRepoButton";

import { AdminTransferOwnershipDialog } from "@/components/Dialogs/AdminTransferOwnershipDialog";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useStaff } from "@/hooks/useStaff";
import { useAdminTransferOwnershipModalStore } from "@/store/modals/adminTransferOwnership";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { LinkOSOProfileButton } from "./LinkOSOProfileButton";
import { LinkDivviWalletButton } from "./LinkDivviWalletButton";
import { GithubIcon } from "@/components/Icons";

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
  const [showLinkContractsDialog, setShowLinkContractsDialog] = useState(false);
  const [showLinkGithubDialog, setShowLinkGithubDialog] = useState(false);
  const [showLinkOSODialog, setShowLinkOSODialog] = useState(false);
  const [showLinkDivviDialog, setShowLinkDivviDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const router = useRouter();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { wallet: dynamicWallet } = useDynamicWallet();
  const { isProjectEditModalOpen, openProjectEditModal } =
    useProjectEditModalStore();
  const { isMergeModalOpen, openMergeModal } = useMergeModalStore();
  const { openGrantGenieModal, isGrantGenieModalOpen } =
    useGrantGenieModalStore();
  const { isTransferOwnershipModalOpen, openTransferOwnershipModal } =
    useTransferOwnershipModalStore();
  const { isAdminTransferOwnershipModalOpen, openAdminTransferOwnershipModal } =
    useAdminTransferOwnershipModalStore();
  const { isProjectOwner } = useProjectStore();
  const { data: contactsInfo } = useContactInfo(projectId);
  const { isOwner: isContractOwner } = useOwnerStore();
  const isAuthorized = isProjectOwner || isContractOwner;
  const { isStaff } = useStaff();

  // Event handlers to reset state when dialogs close
  const handleLinkContractsDialogClose = () => {
    setShowLinkContractsDialog(false);
  };

  const handleLinkGithubDialogClose = () => {
    setShowLinkGithubDialog(false);
  };

  const handleLinkOSODialogClose = () => {
    setShowLinkOSODialog(false);
  };

  const handleLinkDivviDialogClose = () => {
    setShowLinkDivviDialog(false);
  };

  const handleDeleteDialogClose = () => {
    setShowDeleteDialog(false);
  };

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

      const walletSigner = await getWalletSignerWithAA(
        walletClient,
        dynamicWallet,
        "deleteProject"
      );
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
      errorManager(
        MESSAGES.PROJECT.DELETE.ERROR,
        error,
        { projectUID: projectId, address },
        { error: MESSAGES.PROJECT.DELETE.ERROR }
      );
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
          key={`${project?.uid}-${address}`}
          buttonElement={null}
          projectToUpdate={project}
          previousContacts={contactsInfo}
        />
      ) : null}
      {isMergeModalOpen ? <MergeProjectDialog buttonElement={null} /> : null}
      {isGrantGenieModalOpen ? <GrantsGenieDialog /> : null}
      {isTransferOwnershipModalOpen && (
        <TransferOwnershipDialog buttonElement={null} />
      )}
      {isAdminTransferOwnershipModalOpen && <AdminTransferOwnershipDialog />}

      {/* Add the dialog components with visibility controlled by state */}
      {project && (
        <>
          {showLinkContractsDialog && (
            <LinkContractAddressButton
              buttonElement={null}
              buttonClassName={buttonClassName}
              project={
                project as IProjectResponse & {
                  external: Record<string, string[]>;
                }
              }
              onClose={handleLinkContractsDialogClose}
            />
          )}
          {showLinkGithubDialog && (
            <LinkGithubRepoButton
              buttonElement={null}
              buttonClassName={buttonClassName}
              project={
                project as IProjectResponse & {
                  external: Record<string, string[]>;
                }
              }
              onClose={handleLinkGithubDialogClose}
            />
          )}
          {showLinkOSODialog && (
            <LinkOSOProfileButton
              buttonElement={null}
              buttonClassName={buttonClassName}
              project={
                project as IProjectResponse & {
                  external: Record<string, string[]>;
                }
              }
              onClose={handleLinkOSODialogClose}
            />
          )}
          {showLinkDivviDialog && (
            <LinkDivviWalletButton
              buttonElement={null}
              buttonClassName={buttonClassName}
              project={
                project as IProjectResponse & {
                  external: Record<string, string[]>;
                }
              }
              onClose={handleLinkDivviDialogClose}
            />
          )}
          {showDeleteDialog && (
            <DeleteDialog
              title="Are you sure you want to delete this project?"
              deleteFunction={async () => {
                await deleteFn();
                handleDeleteDialogClose();
              }}
              isLoading={isDeleting}
              buttonElement={null}
              afterFunction={handleDeleteDialogClose}
              externalIsOpen={showDeleteDialog}
              externalSetIsOpen={setShowDeleteDialog}
            />
          )}
        </>
      )}

      {(isAuthorized || isStaff) && (
        <Menu as="div" className={`relative inline-block text-left z-1`}>
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
              <div className="flex flex-col gap-1 px-1 py-1 h-full max-h-96 overflow-y-auto">
                {isAuthorized && (
                  <>
                    <Menu.Item>
                      {({ active }) => (
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
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
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
                      )}
                    </Menu.Item>
                    {!isStaff && (
                      <Menu.Item>
                        {({ active }) => (
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
                        )}
                      </Menu.Item>
                    )}
                    <Menu.Item>
                      {({ active }) => {
                        if (!project) return <span></span>;
                        return (
                          <button
                            type="button"
                            onClick={() => setShowLinkContractsDialog(true)}
                            className={buttonClassName}
                          >
                            <LinkIcon
                              className={"mr-2 h-5 w-5"}
                              aria-hidden="true"
                            />
                            Link Contracts
                          </button>
                        );
                      }}
                    </Menu.Item>

                    <Menu.Item>
                      {({ active }) => {
                        if (!project) return <span></span>;
                        return (
                          <button
                            type="button"
                            onClick={() => setShowLinkGithubDialog(true)}
                            className={buttonClassName}
                          >
                            <GithubIcon
                              className={"mr-2 h-5 w-5"}
                              aria-hidden="true"
                            />
                            Link GitHub Repo
                          </button>
                        );
                      }}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => {
                        if (!project) return <span></span>;
                        return (
                          <button
                            type="button"
                            onClick={() => setShowLinkOSODialog(true)}
                            className={buttonClassName}
                          >
                            <FingerPrintIcon
                              className={"mr-2 h-5 w-5"}
                              aria-hidden="true"
                            />
                            Link OSO Profile
                          </button>
                        );
                      }}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => {
                        if (!project) return <span></span>;
                        return (
                          <button
                            type="button"
                            onClick={() => setShowLinkDivviDialog(true)}
                            className={buttonClassName}
                          >
                            <WalletIcon
                              className={"mr-2 h-5 w-5"}
                              aria-hidden="true"
                            />
                            Link Divvi Identifier
                          </button>
                        );
                      }}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={openGrantGenieModal}
                          className={buttonClassName}
                        >
                          <LightBulbIcon className="h-5 w-5 mr-2" />
                          Grant genie
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={() => setShowDeleteDialog(true)}
                          className={buttonClassName}
                        >
                          <TrashIcon
                            className={"mr-2 h-5 w-5"}
                            aria-hidden="true"
                          />
                          Delete project
                        </button>
                      )}
                    </Menu.Item>
                  </>
                )}
                {isStaff && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={openAdminTransferOwnershipModal}
                        className={buttonClassName}
                      >
                        <ArrowsRightLeftIcon
                          className={"mr-2 h-5 w-5"}
                          aria-hidden="true"
                        />
                        Transfer ownership
                      </button>
                    )}
                  </Menu.Item>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      )}
    </>
  );
};
