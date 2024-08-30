"use client";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { deleteProject, getProjectById } from "@/utilities/sdk";
import { cn } from "@/utilities/tailwind";
import { config } from "@/utilities/wagmi/config";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import {
  ArrowDownOnSquareIcon,
  ArrowsRightLeftIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon, PlusIcon } from "@heroicons/react/24/solid";
import { getWalletClient } from "@wagmi/core";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog/index").then(
      (mod) => mod.ProjectDialog
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
  const contactsInfo = useProjectStore((state) => state.projectContactsInfo);
  const [isDeleting, setIsDeleting] = useState(false);
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const router = useRouter();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();

  const deleteFn = async () => {
    if (!address || !project) return;
    setIsDeleting(true);
    try {
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
      }
      const walletClient = await getWalletClient(config, {
        chainId: project.chainID,
      });
      if (!walletClient) return;
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
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button
          // className="inline-flex w-full justify-center rounded-md bg-black/20 px-4 py-2 text-sm font-medium text-white hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
          className="w-max bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 hover:dark:bg-zinc-800 text-black dark:text-white px-4 py-2 rounded-lg"
        >
          ...
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
          className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 focus:outline-none"
        >
          <div className="flex flex-col gap-1 px-1 py-1">
            <Menu.Item>
              <ProjectDialog
                key={project?.uid}
                buttonElement={{
                  icon: (
                    <PencilSquareIcon
                      className={"mr-1 h-5 w-5"}
                      aria-hidden="true"
                    />
                  ),
                  iconSide: "left",
                  text: "Edit project",
                  styleClass: buttonClassName,
                }}
                projectToUpdate={project}
                previousContacts={contactsInfo}
              />
            </Menu.Item>
            <Menu.Item>
              <MergeProjectDialog
                buttonElement={{
                  icon: (
                    <ArrowDownOnSquareIcon
                      className={"mr-2 h-5 w-5"}
                      aria-hidden="true"
                    />
                  ),
                  text: "Merge",
                  styleClass: buttonClassName,
                }}
              />
            </Menu.Item>

            <Menu.Item>
              <TransferOwnershipDialog
                buttonElement={{
                  icon: (
                    <ArrowsRightLeftIcon
                      className={"mr-2 h-5 w-5"}
                      aria-hidden="true"
                    />
                  ),
                  text: "Transfer ownership",
                  styleClass: buttonClassName,
                }}
              />
            </Menu.Item>

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
              <GrantsGenieDialog
                buttonText="Grant genie"
                buttonClassName={buttonClassName}
              />
            </Menu.Item>
            <Menu.Item>
              <DeleteDialog
                title="Are you sure you want to delete this project?"
                deleteFunction={deleteFn}
                isLoading={isDeleting}
                buttonElement={{
                  icon: (
                    <TrashIcon className={"mr-2 h-5 w-5"} aria-hidden="true" />
                  ),
                  text: "Delete project",
                  styleClass: buttonClassName,
                }}
              />
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
