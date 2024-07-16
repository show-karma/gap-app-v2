/* eslint-disable @next/next/no-img-element */
"use client";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { useProjectStore } from "@/store";
import { useOwnerStore } from "@/store/owner";
import { useEffect, useState } from "react";
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
import { shortAddress } from "@/utilities/shortAddress";
import { blo } from "blo";
import { useENSNames } from "@/store/ensNames";
import { Hex } from "viem";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useEndorsementStore } from "@/store/endorsement";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

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

function ProjectBlocks() {
  const project = useProjectStore((state) => state.project);
  const { setIsEndorsementOpen: setIsOpen } = useEndorsementStore();
  const blocks: {
    iconSrc: string;
    title: string;
    description: string;
    link?: string;
    action?: () => void;
    bg: string;
  }[] = [
    {
      iconSrc: "/icons/donate-once.png",
      title: "Donate once",
      description: "Make a one-time contribution",
      link: "/",
      bg: "bg-[#DDF9F2]",
    },
    {
      iconSrc: "/icons/recurring-donate.png",
      title: "Recurring Donation",
      description: "Setup a monthly donation",
      link: "/",
      bg: "bg-[#ECE9FE]",
    },
    {
      iconSrc: "/icons/link.png",
      title: "Farcaster Link",
      description: "Share it to accept donations",
      link: "/",
      bg: "bg-[#FFE6D5]",
    },
    {
      iconSrc: "/icons/intro.png",
      title: "Request intro",
      description: "Get an introduction to connect",
      link: "/",
      bg: "bg-[#DBFFC5]",
    },
    {
      iconSrc: "/icons/support.png",
      title: "Support the Project",
      description: "Help us continue our work",
      link: "/",
      bg: "bg-[#FDE3FF]",
    },
    {
      iconSrc: "/icons/endorsements.png",
      title: "Endorse the Project",
      description: "Publicly endorse our project",
      action: () => setIsOpen(true),
      bg: "bg-[#FFF3D4]",
    },
  ];

  function Block({ item }: { item: (typeof blocks)[number] }) {
    return (
      <div
        className={cn(
          `flex flex-row items-center gap-2 p-4 rounded-xl max-w-[220px] w-full justify-start`,
          item.bg
        )}
      >
        <div className="flex flex-col gap-2 justify-start items-start">
          <img src={item.iconSrc} alt={item.title} className="w-6 h-6" />
          <p className="text-sm font-bold text-black text-left">{item.title}</p>
          <p className="text-sm text-[#344054] text-left">{item.description}</p>
        </div>
        <ChevronRightIcon className="text-[#1D2939] w-5 h-5 min-w-5 min-h-5" />
      </div>
    );
  }
  return (
    <div className="flex flex-row gap-4 flex-wrap">
      {blocks.map((item) =>
        item.action ? (
          <button
            type="button"
            key={item.title}
            onClick={() => item?.action?.()}
          >
            <Block key={item.title} item={item} />
          </button>
        ) : (
          <ExternalLink href={item.link} key={item.title}>
            <Block key={item.title} item={item} />
          </ExternalLink>
        )
      )}
    </div>
  );
}

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

  const { populateEnsNames, ensNames } = useENSNames();

  useEffect(() => {
    if (project?.members) {
      populateEnsNames(project?.members?.map((v) => v.recipient));
    }
  }, [populateEnsNames, project?.members]);

  const [, copy] = useCopyToClipboard();

  return (
    <div className="flex flex-row max-lg:flex-col gap-4 py-5 mb-20">
      {project?.members.length ? (
        <div className="flex flex-col flex-[2]">
          <div className="font-semibold text-black dark:text-white">Team</div>
          <div className=" flex flex-col divide-y divide-y-zinc-200 border border-zinc-200 rounded-xl">
            {project?.members?.map((member) => (
              <div
                key={member.uid}
                className="flex items-center flex-row gap-3 p-3"
              >
                <img
                  src={blo(member.recipient as `0x${string}`, 8)}
                  alt={member.details?.name || member.recipient}
                  className="h-10 w-10 rounded-full"
                />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-[#101828] dark:text-gray-400 line-clamp-1">
                    {member.details?.name ||
                      ensNames[member.recipient as Hex]?.name ||
                      shortAddress(member.recipient)}
                  </p>
                  <div className="flex flex-row gap-2 justify-between items-center">
                    <p className="text-sm font-medium text-[#475467] dark:text-gray-300 line-clamp-1 text-wrap whitespace-nowrap">
                      {ensNames[member.recipient as Hex]?.name ||
                        shortAddress(member.recipient)}
                    </p>
                    <button
                      type="button"
                      onClick={() => copy(member.recipient)}
                    >
                      <img
                        src="/icons/copy-2.svg"
                        alt="Copy"
                        className="text-[#98A2B3] w-4 h-4"
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col flex-[8] max-lg:w-full gap-4">
        <ProjectBlocks />

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

        <div className="flex flex-col gap-1">
          <div className="text-base font-bold leading-normal text-black dark:text-zinc-100">
            Description
          </div>

          <div className="mt-2 space-y-5 ">
            <MarkdownPreview source={project?.details?.data?.description} />
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-[3] gap-8 max-lg:w-full">
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
        <div className="flex flex-col gap-1">
          <p className="text-black dark:text-zinc-400 font-bold text-sm">
            This project has received
          </p>
          <div className="flex flex-row gap-4">
            <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
              <div className="flex flex-col gap-2">
                <p className="text-black dark:text-zinc-300 dark:bg-zinc-800 text-2xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px]  min-w-[40px] w-max h-max">
                  {project?.grants.length || 0}
                </p>
                <div className="flex flex-row gap-2">
                  <p className="font-normal text-[#344054] text-sm dark:text-zinc-300">
                    Grants
                  </p>
                  <img
                    src={"/icons/funding.png"}
                    alt="Grants"
                    className="w-5 h-5"
                  />
                </div>
              </div>
              <div className="w-5 h-5 flex justify-center items-center">
                <ChevronRightIcon className="w-5 h-5 text-[#1D2939] dark:text-zinc-200" />
              </div>
            </div>
            <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
              <div className="flex flex-col gap-2">
                <p className="text-black dark:text-zinc-300 dark:bg-zinc-800 text-2xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px]  min-w-[40px] w-max h-max">
                  {project?.endorsements.length || 0}
                </p>
                <div className="flex flex-row gap-2">
                  <p className="font-normal text-[#344054] text-sm dark:text-zinc-300">
                    Endorsements
                  </p>
                  <img
                    src={"/icons/endorsements.png"}
                    alt="Endorsements"
                    className="w-5 h-5"
                  />
                </div>
              </div>
              <div className="w-5 h-5 flex justify-center items-center">
                <ChevronRightIcon className="w-5 h-5 text-[#1D2939] dark:text-zinc-200" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full">
          <EndorsementList />
        </div>
      </div>
    </div>
  );
}

export default ProjectPage;
