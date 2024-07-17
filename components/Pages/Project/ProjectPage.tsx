"use client";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { useProjectStore } from "@/store";
import { useOwnerStore } from "@/store/owner";
import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import dynamic from "next/dynamic";
import { useGap } from "@/hooks";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { deleteProject } from "@/utilities/sdk/projects/deleteProject";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { getWalletClient } from "@wagmi/core";
import { Button } from "@/components/Utilities/Button";
import Link from "next/link";
import { EndorsementList } from "@/components/Pages/Project/Impact/EndorsementList";
import { useStepper } from "@/store/txStepper";
import { config } from "@/utilities/wagmi/config";
import { getProjectById } from "@/utilities/sdk";
import { RequestIntro } from "./RequestIntroDialog";

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog/index").then(
      (mod) => mod.ProjectDialog
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

function ProjectPage() {
  const project = useProjectStore((state) => state.project);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const [isDeleting, setIsDeleting] = useState(false);
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const router = useRouter();
  const { gap } = useGap();
  const params = useParams();
  const projectId = params.projectId as string;
  const { changeStepperStep, setIsStepper } = useStepper();
  const contactsInfo = useProjectStore((state) => state.projectContactsInfo);

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
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.PROJECT.DELETE.ERROR);
      setIsStepper(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-row max-lg:flex-col gap-4 py-5 mb-20">
      <div className=" flex flex-col w-8/12 max-lg:w-full">
        <div className="text-base flex flex-row gap-1 text-gray-900 dark:text-zinc-100 break-all">
          <p className="text-base font-bold leading-normal text-gray-900 dark:text-zinc-100">
            Owner:
            <span className="font-normal ml-1">
              {project && (
                <EthereumAddressToENSName
                  shouldTruncate={false}
                  address={project.recipient}
                />
              )}
            </span>
          </p>
        </div>

        {project?.details?.data?.tags?.length ? (
          <div className="flex flex-col gap-2">
            <div className="mt-8 text-base font-bold leading-normal text-gray-900 dark:text-zinc-100">
              Categories
            </div>
            <div className="flex items-center gap-x-1">
              {project?.details?.data?.tags?.map((tag) => (
                <span
                  key={tag.name}
                  className="rounded bg-gray-100 px-2 py-1 text-sm  font-normal text-slate-700"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 text-base font-bold leading-normal text-black dark:text-zinc-100">
          Description
        </div>

        <div className="mt-2 space-y-5 ">
          <MarkdownPreview source={project?.details?.data?.description} />
        </div>
      </div>
      <div className="flex flex-col w-4/12 gap-8 max-lg:w-full">
        {isProjectOwner || isOwner ? (
          <div className="flex flex-col gap-2 max-w-full w-full max-lg:max-w-80 2xl:max-w-max">
            <Link
              href={PAGES.PROJECT.IMPACT.ADD_IMPACT(
                project?.details?.data?.slug || projectId
              )}
            >
              <Button className="bg-brand-blue text-white hover:bg-black dark:bg-zinc-800 w-full items-center flex flex-row justify-center max-w-full">
                Add impact
              </Button>
            </Link>
            <RequestIntro UUID="0x0000000" chainid={10001} />
            <div className="flex flex-row justify-between gap-2 flex-wrap max-lg:flex-col w-full max-lg:max-w-80">
              <ProjectDialog
                key={project?.uid}
                buttonElement={{
                  icon: null,
                  text: "Edit project",
                  styleClass:
                    "rounded-md bg-black px-3 py-2 text-sm font-semibold text-white border-none  disabled:opacity-75 transition-all ease-in-out duration-300",
                }}
                projectToUpdate={project}
                previousContacts={contactsInfo}
              />
              <TransferOwnershipDialog
                buttonElement={{
                  icon: null,
                  text: "Transfer Ownership",
                  styleClass:
                    "bg-red-600 items-center justify-center hover:bg-red-500",
                }}
              />
              <DeleteDialog
                title="Are you sure you want to delete this project?"
                deleteFunction={deleteFn}
                isLoading={isDeleting}
                buttonElement={{
                  icon: null,
                  text: "Delete project",
                  styleClass:
                    "bg-red-600 items-center justify-center hover:bg-red-500",
                }}
              />
            </div>
          </div>
        ) : null}
        <div className="flex w-full">
          <EndorsementList />
        </div>
      </div>
    </div>
  );
}

export default ProjectPage;
