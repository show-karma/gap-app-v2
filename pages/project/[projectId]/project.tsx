import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { useProjectStore } from "@/store";
import { useOwnerStore } from "@/store/owner";
import { useState } from "react";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { MESSAGES, PAGES, deleteProject, useSigner } from "@/utilities";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { ProjectFeed } from "@/components/ProjectFeed";
import dynamic from "next/dynamic";

const ProjectDialog = dynamic(() =>
  import("@/components/ProjectDialog").then((mod) => mod.ProjectDialog)
);

const DeleteDialog = dynamic(() =>
  import("@/components/DeleteDialog").then((mod) => mod.DeleteDialog)
);

const TransferOwnershipDialog = dynamic(() =>
  import("@/components/TransferOwnershipDialog").then(
    (mod) => mod.TransferOwnershipDialog
  )
);

function ProjectPage() {
  const project = useProjectStore((state) => state.project);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const [isDeleting, setIsDeleting] = useState(false);
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const router = useRouter();
  const signer = useSigner();

  const deleteFn = async () => {
    if (!address || !project) return;
    setIsDeleting(true);
    try {
      if (chain && chain.id !== project.chainID) {
        await switchNetworkAsync?.(project.chainID);
      }
      await deleteProject(project, signer)
        .then(async () => {
          toast.success(MESSAGES.PROJECT.DELETE.SUCCESS);
          router.push(PAGES.MY_PROJECTS);
        })
        .catch((error) => console.log(error));
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.PROJECT.DELETE.ERROR);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-row max-lg:flex-col-reverse gap-4 py-5 mb-20">
      <div className=" flex flex-col flex-[3]">
        <div className="text-base flex flex-row gap-1">
          <span className="font-semibold">Owner:</span>
          {project && (
            <EthereumAddressToENSName
              shouldTruncate={false}
              address={project.recipient}
            />
          )}
        </div>

        {project?.details?.tags.length ? (
          <div className="flex flex-col gap-2">
            <div className="mt-5 font-semibold">Categories</div>
            <div className="flex items-center gap-x-1">
              {project?.details?.tags?.map((tag) => (
                <span
                  key={tag.name}
                  className="inline-flex items-center rounded-md bg-gray-200 dark:bg-zinc-800 dark:text-zinc-200 px-2 py-1 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 font-semibold">Description</div>

        <div className="mt-2 space-y-5">
          <MarkdownPreview source={project?.details?.description} />
        </div>
      </div>
      <div className="flex flex-col flex-[1] gap-8">
        {isProjectOwner || isOwner ? (
          <div className="flex flex-row gap-2 flex-wrap">
            <ProjectDialog
              key={project?.uid}
              buttonElement={{
                icon: null,
                text: "Edit project",
                styleClass:
                  "rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600  disabled:opacity-75 transition-all ease-in-out duration-300",
              }}
              projectToUpdate={project}
            />
            <TransferOwnershipDialog
              buttonElement={{
                icon: null,
                text: "Transfer Ownership",
                styleClass: "bg-red-600 hover:bg-red-500",
              }}
            />
            <DeleteDialog
              title="Are you sure you want to delete this project?"
              deleteFunction={deleteFn}
              isLoading={isDeleting}
              buttonElement={{
                icon: null,
                text: "Delete project",
                styleClass: "bg-red-600 hover:bg-red-500",
              }}
            />
          </div>
        ) : null}
        <ProjectFeed />
      </div>
    </div>
  );
}

export default ProjectPage;
