"use client";

import {
  ArrowDownOnSquareIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  FingerPrintIcon,
  LightBulbIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { AdminTransferOwnershipDialog } from "@/components/Dialogs/AdminTransferOwnershipDialog";
import { GithubIcon } from "@/components/Icons";
import { errorManager } from "@/components/Utilities/errorManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useAuth } from "@/hooks/useAuth";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useStaff } from "@/hooks/useStaff";
import { useWallet } from "@/hooks/useWallet";
import { useIsCommunityAdmin } from "@/src/core/rbac/context/permission-context";
import { SetChainPayoutAddressModal } from "@/src/features/chain-payout-address";
import { useOwnerStore, useProjectStore } from "@/store";
import { useAdminTransferOwnershipModalStore } from "@/store/modals/adminTransferOwnership";
import { useGrantGenieModalStore } from "@/store/modals/genie";
import { useMergeModalStore } from "@/store/modals/merge";
import { useProjectEditModalStore } from "@/store/modals/projectEdit";
import { useTransferOwnershipModalStore } from "@/store/modals/transferOwnership";
import { MESSAGES } from "@/utilities/messages";
import { deleteProject, getProjectById } from "@/utilities/sdk";
import { LinkContractAddressButton } from "./LinkContractAddressButton";
import { LinkDivviWalletButton } from "./LinkDivviWalletButton";
import { LinkGithubRepoButton } from "./LinkGithubRepoButton";
import { LinkOSOProfileButton } from "./LinkOSOProfileButton";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog").then((mod) => mod.ProjectDialog),
  { ssr: false }
);
const GrantsGenieDialog = dynamic(
  () => import("@/components/Dialogs/GrantGenieDialog").then((mod) => mod.GrantsGenieDialog),
  { ssr: false }
);

const DeleteDialog = dynamic(() =>
  import("@/components/DeleteDialog").then((mod) => mod.DeleteDialog)
);

const TransferOwnershipDialog = dynamic(() =>
  import("@/components/Dialogs/TransferOwnershipDialog").then((mod) => mod.TransferOwnershipDialog)
);
const MergeProjectDialog = dynamic(() =>
  import("@/components/Dialogs/MergeProjectDialog").then((mod) => mod.MergeProjectDialog)
);

const buttonClassName = `group cursor-pointer font-normal text-gray-900 dark:text-zinc-100 hover:bg-brand-blue hover:text-white dark:hover:bg-brand-blue dark:hover:text-white flex w-full items-center justify-start gap-2 rounded-md px-2 py-2 text-sm transition-colors`;

/**
 * Renders all project-related dialogs that are controlled by global stores.
 * This component should be rendered ONCE in the layout to avoid duplicate dialogs.
 * The dialogs are controlled by Zustand stores (useProjectEditModalStore, useMergeModalStore, etc.)
 */
export const ProjectOptionsDialogs = () => {
  const { project, refreshProject } = useProjectStore();
  const params = useParams();
  const projectId = params.projectId as string;
  const { address, chain } = useAccount();
  const router = useRouter();
  const { switchChainAsync } = useWallet();
  const { startAttestation, showSuccess, showError, changeStepperStep, setIsStepper } =
    useAttestationToast();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const { data: contactsInfo } = useContactInfo(projectId);

  // Global modal stores
  const { isProjectEditModalOpen } = useProjectEditModalStore();
  const { isMergeModalOpen } = useMergeModalStore();
  const { isGrantGenieModalOpen } = useGrantGenieModalStore();
  const { isTransferOwnershipModalOpen } = useTransferOwnershipModalStore();
  const { isAdminTransferOwnershipModalOpen } = useAdminTransferOwnershipModalStore();

  return (
    <>
      {isProjectEditModalOpen ? (
        <ProjectDialog
          key={`${project?.uid}-${address}`}
          buttonElement={null}
          projectToUpdate={project}
          previousContacts={contactsInfo || []}
          useEditModalStore={true}
        />
      ) : null}
      {isMergeModalOpen ? <MergeProjectDialog buttonElement={null} /> : null}
      {isGrantGenieModalOpen ? <GrantsGenieDialog /> : null}
      {isTransferOwnershipModalOpen && <TransferOwnershipDialog buttonElement={null} />}
      {isAdminTransferOwnershipModalOpen && <AdminTransferOwnershipDialog />}
    </>
  );
};

export const ProjectOptionsMenu = () => {
  const { project } = useProjectStore();
  const params = useParams();
  const projectId = params.projectId as string;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLinkContractsDialog, setShowLinkContractsDialog] = useState(false);
  const [showViewContractsDialog, setShowViewContractsDialog] = useState(false);
  const [showLinkGithubDialog, setShowLinkGithubDialog] = useState(false);
  const [showLinkOSODialog, setShowLinkOSODialog] = useState(false);
  const [showLinkDivviDialog, setShowLinkDivviDialog] = useState(false);
  const [showSetPayoutDialog, setShowSetPayoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { address, chain } = useAccount();
  const { authenticated: isAuthenticated } = useAuth();
  const { switchChainAsync } = useWallet();
  const router = useRouter();
  const { startAttestation, showSuccess, showError, changeStepperStep, setIsStepper } =
    useAttestationToast();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const { openProjectEditModal } = useProjectEditModalStore();
  const { openMergeModal } = useMergeModalStore();
  const { openGrantGenieModal } = useGrantGenieModalStore();
  const { openTransferOwnershipModal } = useTransferOwnershipModalStore();
  const { openAdminTransferOwnershipModal } = useAdminTransferOwnershipModalStore();
  const { isProjectOwner, refreshProject } = useProjectStore();
  const { data: contactsInfo } = useContactInfo(projectId);
  const { isOwner: isContractOwner } = useOwnerStore();
  const isCommunityAdmin = useIsCommunityAdmin();
  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;
  const { isStaff, isLoading: isStaffLoading } = useStaff();

  // Event handlers to reset state when dialogs close
  const handleLinkContractsDialogClose = () => {
    setShowLinkContractsDialog(false);
  };

  const handleViewContractsDialogClose = () => {
    setShowViewContractsDialog(false);
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

  const handleSetPayoutDialogClose = () => {
    setShowSetPayoutDialog(false);
  };

  const handleDeleteDialogClose = () => {
    setShowDeleteDialog(false);
  };

  const deleteFn = async () => {
    if (!address || !project) return;
    setIsDeleting(true);
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
      if (!fetchedProject || !gapClient) return;
      await deleteProject(
        fetchedProject,
        walletSigner,
        gapClient,
        router,
        changeStepperStep,
        setIsStepper,
        startAttestation,
        showSuccess
      );
    } catch (error: any) {
      showError(MESSAGES.PROJECT.DELETE.ERROR);
      errorManager(
        MESSAGES.PROJECT.DELETE.ERROR,
        error,
        { projectUID: projectId, address },
        { error: MESSAGES.PROJECT.DELETE.ERROR }
      );
      setIsStepper(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Local dialogs controlled by component state - these are safe to render per instance */}
      {project && (
        <>
          {showLinkContractsDialog && (
            <LinkContractAddressButton
              buttonElement={null}
              buttonClassName={buttonClassName}
              project={project}
              onClose={handleLinkContractsDialogClose}
            />
          )}
          {showViewContractsDialog && (
            <LinkContractAddressButton
              buttonElement={null}
              buttonClassName={buttonClassName}
              project={project}
              onClose={handleViewContractsDialogClose}
              readOnly={true}
            />
          )}
          {showLinkGithubDialog && (
            <LinkGithubRepoButton
              buttonElement={null}
              buttonClassName={buttonClassName}
              project={project}
              onClose={handleLinkGithubDialogClose}
            />
          )}
          {showLinkOSODialog && (
            <LinkOSOProfileButton
              buttonElement={null}
              buttonClassName={buttonClassName}
              project={project}
              onClose={handleLinkOSODialogClose}
            />
          )}
          {showLinkDivviDialog && (
            <LinkDivviWalletButton
              buttonElement={null}
              buttonClassName={buttonClassName}
              project={project}
              onClose={handleLinkDivviDialogClose}
            />
          )}
          {showSetPayoutDialog && (
            <SetChainPayoutAddressModal
              isOpen={showSetPayoutDialog}
              onClose={handleSetPayoutDialogClose}
              projectId={project.uid}
              currentAddresses={project.chainPayoutAddress}
              onSuccess={() => refreshProject()}
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

      {!isStaffLoading && (isAuthorized || isStaff || isAuthenticated) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
              data-testid="project-options-menu"
            >
              <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Project Settings</span>
              <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-96 overflow-y-auto">
            {(isAuthorized || isStaff) && (
              <>
                <DropdownMenuItem onClick={openProjectEditModal} className={buttonClassName}>
                  <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                  Edit project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openMergeModal} className={buttonClassName}>
                  <ArrowDownOnSquareIcon className="h-5 w-5" aria-hidden="true" />
                  Merge
                </DropdownMenuItem>
                {!isStaff ? (
                  <DropdownMenuItem
                    onClick={openTransferOwnershipModal}
                    className={buttonClassName}
                  >
                    <ArrowsRightLeftIcon className="h-5 w-5" aria-hidden="true" />
                    Transfer ownership
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={openAdminTransferOwnershipModal}
                    className={buttonClassName}
                  >
                    <ArrowsRightLeftIcon className="h-5 w-5" aria-hidden="true" />
                    Transfer ownership
                  </DropdownMenuItem>
                )}
                {project && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setShowLinkContractsDialog(true)}
                      className={buttonClassName}
                    >
                      <LinkIcon className="h-5 w-5" aria-hidden="true" />
                      Link Contracts
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowLinkGithubDialog(true)}
                      className={buttonClassName}
                    >
                      <GithubIcon className="h-5 w-5" aria-hidden="true" />
                      Link GitHub Repo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowLinkOSODialog(true)}
                      className={buttonClassName}
                    >
                      <FingerPrintIcon className="h-5 w-5" aria-hidden="true" />
                      Link OSO Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowLinkDivviDialog(true)}
                      className={buttonClassName}
                    >
                      <WalletIcon className="h-5 w-5" aria-hidden="true" />
                      Link Divvi Identifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowSetPayoutDialog(true)}
                      className={buttonClassName}
                    >
                      <CurrencyDollarIcon className="h-5 w-5" aria-hidden="true" />
                      Set Payout Address
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={openGrantGenieModal} className={buttonClassName}>
                  <LightBulbIcon className="h-5 w-5" aria-hidden="true" />
                  Grant genie
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className={buttonClassName}
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                  Delete project
                </DropdownMenuItem>
              </>
            )}
            {/* Non-authorized but logged-in users: View Contracts only */}
            {!isAuthorized && !isStaff && isAuthenticated && project && (
              <DropdownMenuItem
                onClick={() => setShowViewContractsDialog(true)}
                className={buttonClassName}
              >
                <LinkIcon className="h-5 w-5" aria-hidden="true" />
                View Contracts
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
};
