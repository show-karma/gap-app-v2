/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { useOwnerStore, useProjectStore } from "@/store";
import { cn } from "@/utilities/tailwind";
import { useQueryState } from "nuqs";
import { ButtonHTMLAttributes, FC, useState } from "react";
import { ProjectUpdateForm } from "./ProjectUpdateForm";
import { IProjectUpdate } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { formatDate } from "@/utilities/formatDate";
import { DeleteDialog } from "@/components/DeleteDialog";
import { TrashIcon } from "@heroicons/react/24/outline";
import { ReadMore } from "@/utilities/ReadMore";
import { getGapClient, useGap } from "@/hooks";
import { useStepper } from "@/store/modals/txStepper";
import toast from "react-hot-toast";
import { MESSAGES } from "@/utilities/messages";
import { getWalletClient } from "@wagmi/core";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useAccount, useSwitchChain } from "wagmi";
import { config } from "@/utilities/wagmi/config";
import { Hex } from "viem";
import * as Sentry from "@sentry/react";
import { errorManager } from "@/components/Utilities/ErrorManager";

const InformationTab: FC = () => {
  const { project } = useProjectStore();
  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold leading-normal text-black dark:text-zinc-100">
          Description
        </div>

        <div className="mt-2 space-y-5 ">
          <MarkdownPreview source={project?.details?.data?.description} />
        </div>
      </div>
      {project?.details?.data?.missionSummary && (
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold leading-normal text-black dark:text-zinc-100">
            Mission
          </div>

          <div className="mt-2 space-y-5 ">
            <MarkdownPreview source={project?.details?.data?.missionSummary} />
          </div>
        </div>
      )}

      {project?.details?.data?.problem && (
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold leading-normal text-black dark:text-zinc-100">
            Problem
          </div>

          <div className="mt-2 space-y-5 ">
            <MarkdownPreview source={project?.details?.data?.problem} />
          </div>
        </div>
      )}
      {project?.details?.data?.solution && (
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold leading-normal text-black dark:text-zinc-100">
            Solution
          </div>

          <div className="mt-2 space-y-5 ">
            <MarkdownPreview source={project?.details?.data?.solution} />
          </div>
        </div>
      )}
      {project?.details?.data?.locationOfImpact && (
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold leading-normal text-black dark:text-zinc-100">
            Location of Impact
          </div>

          <div className="mt-2 space-y-5 ">
            <MarkdownPreview
              source={project?.details?.data?.locationOfImpact}
            />
          </div>
        </div>
      )}
    </>
  );
};

const UpdateBlock = ({
  update,
  index,
}: {
  update: IProjectUpdate;
  index: number;
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isAuthorized = isOwner || isProjectOwner;
  const [isDeletingUpdate, setIsDeletingUpdate] = useState(false);
  const { changeStepperStep, setIsStepper } = useStepper();
  const { gap } = useGap();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const deleteProjectUpdate = async () => {
    let gapClient = gap;
    try {
      setIsDeletingUpdate(true);
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== update.chainID) {
        await switchChainAsync?.({ chainId: update.chainID });
        gapClient = getGapClient(update.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: update.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      if (!instanceProject) {
        throw new Error("Project not found");
      }
      const findUpdate = instanceProject.updates.find(
        (upd) => upd.uid === update.uid
      );
      if (!findUpdate) {
        throw new Error("Update not found");
      }
      await findUpdate
        .revoke(walletSigner as any, changeStepperStep)
        .then(async () => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedProject = null;
          while (retries > 0) {
            fetchedProject = await gapClient!.fetch
              .projectById(project?.uid as Hex)
              .catch(() => null);
            const stillExists = fetchedProject?.updates?.find(
              (upd) => ((upd as any)?._uid || upd.uid) === update.uid
            );
            if (!stillExists) {
              retries = 0;
              changeStepperStep("indexed");
              toast.success(MESSAGES.PROJECT_UPDATE_FORM.DELETE.SUCCESS);
              await refreshProject();
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.PROJECT_UPDATE_FORM.DELETE.ERROR);
      errorManager(
        `Error deleting project update ${update.uid} from project ${project?.uid}`,
        error
      );
    } finally {
      setIsDeletingUpdate(false);
      setIsStepper(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-4 rounded-lg  dark:bg-zinc-800 bg-[#F8F9FC] p-4 transition-all duration-200 ease-in-out  max-sm:px-2">
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row gap-3 items-center">
          <div className="flex items-center h-max w-max flex-row gap-2 rounded-full bg-[#5720B7] dark:bg-purple-900 px-3 py-1">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.3335 2.66421H4.5335C3.41339 2.66421 2.85334 2.66421 2.42552 2.8822C2.04919 3.07395 1.74323 3.37991 1.55148 3.75623C1.3335 4.18406 1.3335 4.74411 1.3335 5.86421V11.4642C1.3335 12.5843 1.3335 13.1444 1.55148 13.5722C1.74323 13.9485 2.04919 14.2545 2.42552 14.4462C2.85334 14.6642 3.41339 14.6642 4.5335 14.6642H10.1335C11.2536 14.6642 11.8137 14.6642 12.2415 14.4462C12.6178 14.2545 12.9238 13.9485 13.1155 13.5722C13.3335 13.1444 13.3335 12.5843 13.3335 11.4642V8.66421M5.33348 10.6642H6.44984C6.77596 10.6642 6.93902 10.6642 7.09247 10.6274C7.22852 10.5947 7.35858 10.5408 7.47788 10.4677C7.61243 10.3853 7.72773 10.27 7.95833 10.0394L14.3335 3.66421C14.8858 3.11193 14.8858 2.2165 14.3335 1.66421C13.7812 1.11193 12.8858 1.11193 12.3335 1.66421L5.95832 8.03938C5.72772 8.26998 5.61241 8.38528 5.52996 8.51983C5.45685 8.63913 5.40298 8.76919 5.37032 8.90524C5.33348 9.05869 5.33348 9.22175 5.33348 9.54787V10.6642Z"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <p className="text-xs font-bold text-white">UPDATE</p>
          </div>
        </div>
        <div className="flex flex-row gap-3 items-center">
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
            Posted on {formatDate(update.createdAt)}
          </p>
          {isAuthorized ? (
            <DeleteDialog
              deleteFunction={deleteProjectUpdate}
              isLoading={isDeletingUpdate}
              title={
                <p className="font-normal">
                  Are you sure you want to delete <b>{update.data.title}</b>{" "}
                  update?
                </p>
              }
              buttonElement={{
                text: "",
                icon: <TrashIcon className="text-red-500 w-5 h-5" />,
                styleClass:
                  "bg-transparent p-0 w-max h-max text-red-500 hover:bg-transparent",
              }}
            />
          ) : null}
        </div>
      </div>
      {update.data.title ? (
        <p className="text-lg font-semibold text-black dark:text-zinc-100 max-sm:text-base">
          {update.data.title}
        </p>
      ) : null}
      <div>
        <ReadMore
          readLessText="Read less update"
          readMoreText="Read full update"
          markdownClass="text-black font-normal text-base"
          side="left"
        >
          {update.data.text}
        </ReadMore>
      </div>
    </div>
  );
};

const UpdatesTab: FC = () => {
  const { project } = useProjectStore();

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isAuthorized = isOwner || isProjectOwner;
  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "info",
  });

  const updates: IProjectUpdate[] = project?.updates || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4 justify-between">
        <p className="font-bold text-black dark:text-zinc-200 text-base">
          Updates {updates.length ? `(${updates.length})` : ""}
        </p>
        {isAuthorized ? (
          <Button
            onClick={() => setActiveTab("post-update")}
            className="flex h-max w-max dark:bg-zinc-900 dark:text-white text-zinc-900 flex-row items-center justify-center gap-3 rounded border border-black bg-transparent px-3 py-1 text-sm font-semibold hover:bg-transparent hover:opacity-75"
          >
            Post a Project Update
          </Button>
        ) : null}
      </div>
      {updates.length ? (
        <div className="flex flex-col gap-6">
          {updates.map((update, index) => (
            <UpdateBlock key={update.id} update={update} index={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {isAuthorized ? (
            <div className="flex flex-1 flex-col gap-6">
              <div
                className="flex h-60 border-spacing-4 flex-col items-center justify-center gap-5 rounded border border-blue-600 dark:bg-zinc-900 bg-[#EEF4FF] px-8"
                style={{
                  border: "dashed 2px #155EEF",
                }}
              >
                <p className="w-full text-center text-lg break-words h-max font-semibold text-black dark:text-zinc-200">
                  Go ahead and create your first project update
                </p>
                <button
                  className="items-center flex flex-row justify-center gap-2 rounded border border-blue-600 bg-blue-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-blue-600"
                  onClick={() => {
                    setActiveTab("post-update");
                  }}
                >
                  <img
                    src="/icons/plus.svg"
                    alt="Add"
                    className="relative h-5 w-5"
                  />
                  Post a Project Update
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center rounded border border-gray-200 px-6 py-10">
              <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
                <img
                  src="/images/comments.png"
                  alt=""
                  className="h-[185px] w-[438px] object-cover"
                />
                <div className="flex w-full flex-col items-center justify-center gap-3">
                  <p className="text-center text-lg font-semibold text-black dark:text-zinc-100 ">
                    Welcome to the Project Updates section!
                  </p>
                  <p className="text-center text-base font-normal text-black dark:text-zinc-100 ">
                    {MESSAGES.PROJECT.EMPTY.UPDATES.NOT_CREATED}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const tabs = {
  info: InformationTab,
  updates: UpdatesTab,
  "post-update": ProjectUpdateForm,
};

const tabClasses =
  "flex flex-1 rounded-md font-semibold justify-center items-center text-base dark:text-zinc-100 transition-colors duration-100 ease-in-out p-2";

interface TabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive: boolean;
}

const TabButton: FC<TabButtonProps> = ({ isActive, children, ...props }) => {
  if (isActive) {
    return (
      <button
        type="button"
        className={cn(tabClasses, "bg-white dark:bg-zinc-700 text-zinc-700")}
        {...props}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={cn(tabClasses, "text-zinc-500")}
      {...props}
    >
      {children}
    </button>
  );
};

const protectedTabs = ["post-update"];

const nestedTabs: Record<string, string[]> = {
  info: [],
  updates: ["post-update"],
};

export function ProjectBodyTabs() {
  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "info",
  });
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isAuthorized = isOwner || isProjectOwner;

  const getActiveTab = () => {
    if (protectedTabs.includes(activeTab) && !isAuthorized) {
      const InfoTab = tabs.info;
      return <InfoTab />;
    }
    const Tab = tabs[activeTab as keyof typeof tabs] || tabs.info;
    return <Tab />;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-md">
        <TabButton
          isActive={
            activeTab === "info" || nestedTabs["info"].includes(activeTab)
          }
          onClick={() => setActiveTab("info")}
        >
          Information
        </TabButton>
        <TabButton
          isActive={
            activeTab === "updates" || nestedTabs["updates"].includes(activeTab)
          }
          onClick={() => setActiveTab("updates")}
        >
          Updates
        </TabButton>
      </div>
      {getActiveTab()}
    </div>
  );
}
