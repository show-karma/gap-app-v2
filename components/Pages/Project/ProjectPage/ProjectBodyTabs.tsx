/* eslint-disable @next/next/no-img-element */
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import { getGapClient, useGap } from "@/hooks";
import { useOwnerStore, useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { ReadMore } from "@/utilities/ReadMore";
import { cn } from "@/utilities/tailwind";
import { config } from "@/utilities/wagmi/config";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PencilIcon,
  PencilSquareIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Bars4Icon } from "@heroicons/react/24/solid";
import {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQueryState } from "nuqs";
import { ButtonHTMLAttributes, FC, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";
import { errorManager } from "@/components/Utilities/errorManager";

import { BusinessModelIcon } from "@/components/Icons/BusinessModel";
import { FundsRaisedIcon } from "@/components/Icons/FundsRaised";
import { PathIcon } from "@/components/Icons/PathIcon";
import { StageIcon } from "@/components/Icons/StageIcon";
import { TargetIcon } from "@/components/Icons/Target";
import { PAGES } from "@/utilities/pages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { ProjectActivityBlock } from "./ProjectActivityBlock";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { ProjectBlocks } from "./ProjectBlocks";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";

const InformationTab: FC = () => {
  const { project } = useProjectStore();
  return (
    <div
      id="information-tab"
      className="flex flex-col gap-6 max-sm:gap-4 flex-1 w-full"
    >
      <ProjectBlocks />

      <div className="flex flex-row gap-2 items-start justify-start">
        <Bars4Icon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
        <div className="flex flex-col gap-1 justify-start items-start flex-1 w-full max-w-full">
          <p className="font-bold leading-normal text-black dark:text-zinc-100">
            Description
          </p>
          <ReadMore
            readLessText="Show less"
            readMoreText="Show more"
            markdownClass="text-black dark:text-zinc-100 font-normal text-base w-full max-w-full"
            side="left"
            words={200}
          >
            {project?.details?.data?.description || ""}
          </ReadMore>
        </div>
      </div>
      {project?.details?.data?.missionSummary && (
        <div className="flex flex-row gap-2 items-start justify-start">
          <TargetIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px]  text-black dark:text-zinc-100" />
          <div className="flex flex-col gap-1 justify-start items-start">
            <p className="font-bold leading-normal text-black dark:text-zinc-100">
              Mission
            </p>
            <ReadMore
              readLessText="Show less"
              readMoreText="Show more"
              markdownClass="text-black dark:text-zinc-100 font-normal text-base"
              side="left"
              words={200}
            >
              {project?.details?.data?.missionSummary || ""}
            </ReadMore>
          </div>
        </div>
      )}

      {project?.details?.data?.problem && (
        <div className="flex flex-row gap-2 items-start justify-start">
          <ExclamationTriangleIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
          <div className="flex flex-col gap-1 justify-start items-start">
            <p className="font-bold leading-normal text-black dark:text-zinc-100">
              Problem
            </p>
            <ReadMore
              readLessText="Show less"
              readMoreText="Show more"
              markdownClass="text-black dark:text-zinc-100 font-normal text-base"
              side="left"
              words={200}
            >
              {project?.details?.data?.problem || ""}
            </ReadMore>
          </div>
        </div>
      )}
      {project?.details?.data?.solution && (
        <div className="flex flex-row gap-2 items-start justify-start">
          <CheckCircleIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
          <div className="flex flex-col gap-1 justify-start items-start">
            <p className="font-bold leading-normal text-black dark:text-zinc-100">
              Solution
            </p>
            <ReadMore
              readLessText="Show less"
              readMoreText="Show more"
              markdownClass="text-black dark:text-zinc-100 font-normal text-base"
              side="left"
              words={200}
            >
              {project?.details?.data?.solution || ""}
            </ReadMore>
          </div>
        </div>
      )}
      {project?.details?.data?.locationOfImpact && (
        <div className="flex flex-row gap-2 items-start justify-start">
          <MapPinIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
          <div className="flex flex-col gap-1 justify-start items-start">
            <p className="font-bold leading-normal text-black dark:text-zinc-100">
              Location of Impact
            </p>
            <ReadMore
              readLessText="Show less"
              readMoreText="Show more"
              markdownClass="text-black dark:text-zinc-100 font-normal text-base"
              side="left"
              words={200}
            >
              {project?.details?.data?.locationOfImpact || ""}
            </ReadMore>
          </div>
        </div>
      )}
      {project?.details?.data?.businessModel ||
      project?.details?.data?.pathToTake ||
      project?.details?.data?.stageIn ||
      project?.details?.data?.raisedMoney ? (
        <div className="flex flex-col px-6 py-6 gap-6 border-[#DCDFEA] border rounded-xl">
          <div className="flex flex-row gap-2 items-start justify-start">
            <BusinessModelIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
            <div className="flex flex-col gap-1 justify-start items-start">
              <p className="font-bold leading-normal text-black dark:text-zinc-100">
                Business Model
              </p>
              <ReadMore
                readLessText="Show less"
                readMoreText="Show more"
                markdownClass="text-black dark:text-zinc-100 font-normal text-base"
                side="left"
                words={200}
              >
                {project?.details?.data?.businessModel || ""}
              </ReadMore>
            </div>
          </div>

          <div className="flex flex-row  max-sm:flex-col gap-10 max-sm:gap-4 items-center max-sm:items-start justify-start flex-wrap">
            {project?.details?.data?.pathToTake ? (
              <div className="flex flex-row gap-2 max-sm:flex-col items-start justify-start">
                <div className="flex flex-row gap-3 justify-start items-start">
                  <PathIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
                  <p className="font-bold leading-normal text-black dark:text-zinc-100">
                    Path
                  </p>
                </div>
                <p className="font-normal text-base leading-normal text-black dark:text-zinc-100">
                  {project?.details?.data?.pathToTake}
                </p>
              </div>
            ) : null}
            {project?.details?.data?.stageIn ? (
              <div className="flex flex-row gap-2 max-sm:flex-col items-start justify-start">
                <div className="flex flex-row gap-3 justify-start items-start">
                  <StageIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
                  <p className="font-bold leading-normal text-black dark:text-zinc-100">
                    Stage
                  </p>
                </div>
                <p className="font-normal text-base leading-normal text-black dark:text-zinc-100">
                  {project?.details?.data?.stageIn}
                </p>
              </div>
            ) : null}
          </div>
          {project?.details?.data?.raisedMoney ? (
            <div className="flex flex-row gap-2 max-sm:flex-col items-start justify-start">
              <div className="flex flex-row gap-3 justify-start items-start">
                <FundsRaisedIcon className="w-6 h-6 max-w-6 max-h-[24px] min-w-6 min-h-[24px] text-black dark:text-zinc-100" />
                <p className="font-bold leading-normal text-black dark:text-zinc-100">
                  Total Funds Raised
                </p>
              </div>
              <p className="font-normal text-base leading-normal text-black dark:text-zinc-100">
                {project?.details?.data?.raisedMoney}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const UpdateBlock = ({
  update,
  index,
}: {
  update: IProjectUpdate | IGrantUpdate | IMilestoneResponse | IProjectImpact;
  index: number;
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;
  const [isDeletingUpdate, setIsDeletingUpdate] = useState(false);
  const { changeStepperStep, setIsStepper } = useStepper();
  const { gap } = useGap();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { project, isProjectOwner } = useProjectStore();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isOnChainAuthorized = isProjectOwner || isOwner;
  const router = useRouter();

  const deleteProjectUpdate = async () => {
    let gapClient = gap;

    try {
      setIsDeletingUpdate(true);
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== update.chainID) {
        await switchChainAsync?.({ chainId: update.chainID });
        gapClient = getGapClient(update.chainID);
      }

      const { walletClient, error } = await safeGetWalletClient(update.chainID);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
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

      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedProject = await refreshProject();

            const stillExists = fetchedProject?.updates?.find(
              (upd) => ((upd as any)?._uid || upd.uid) === update.uid
            );
            return !stillExists;
          },
          () => {
            callbackFn?.();
          }
        );
      };
      if (!isOnChainAuthorized) {
        const toastLoading = toast.loading(
          MESSAGES.PROJECT_UPDATE_FORM.DELETE.LOADING
        );
        await fetchData(
          INDEXER.PROJECT.REVOKE_ATTESTATION(
            findUpdate?.uid as `0x${string}`,
            findUpdate.chainID
          ),
          "POST",
          {}
        )
          .then(async () => {
            checkIfAttestationExists()
              .then(() => {
                toast.success(MESSAGES.PROJECT_UPDATE_FORM.DELETE.SUCCESS, {
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
        await findUpdate
          .revoke(walletSigner as any, changeStepperStep)
          .then(async (res) => {
            const txHash = res?.tx[0]?.hash;
            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, findUpdate.chainID),
                "POST",
                {}
              );
            }

            await checkIfAttestationExists(() => {
              changeStepperStep("indexed");
            }).then(() => {
              toast.success(MESSAGES.PROJECT_UPDATE_FORM.DELETE.SUCCESS);
            });
          });
      }
    } catch (error: any) {
      errorManager(
        MESSAGES.PROJECT_UPDATE_FORM.DELETE.ERROR,
        error,
        {
          projectUID: project?.uid,
          updateUID: update.uid,
        },
        { error: MESSAGES.PROJECT_UPDATE_FORM.DELETE.ERROR }
      );
    } finally {
      setIsDeletingUpdate(false);
      setIsStepper(false);
    }
  };

  const labelDictionary = {
    ProjectUpdate: "ACTIVITY",
    GrantUpdate: "GRANT UPDATE",
    Milestone: "MILESTONE",
    ProjectImpact: "IMPACT",
  };

  const shareDictionary = {
    ProjectUpdate: SHARE_TEXTS.PROJECT_ACTIVITY(
      project?.details?.data?.title as string,
      project?.uid as string
    ),
    GrantUpdate: SHARE_TEXTS.GRANT_UPDATE(
      project?.details?.data?.title as string,
      project?.uid as string,
      update.uid
    ),
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

            <p className="text-xs font-bold text-white">
              {labelDictionary[update.type as keyof typeof labelDictionary]}
            </p>
          </div>
        </div>
        <div className="flex flex-row gap-3 items-center">
          {update.type === "ProjectUpdate" ? (
            (update as any).data?.startDate || (update as any).data?.endDate ? (
              <p className="text-sm font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
                {`${
                  update.data?.startDate
                    ? formatDate(update.data?.startDate)
                    : ""
                } ${
                  update.data?.startDate && update.data?.endDate ? "-" : ""
                } ${
                  update.data?.endDate ? formatDate(update.data?.endDate) : ""
                }`}
              </p>
            ) : (
              <p className="text-sm font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
                Posted on {formatDate(update.createdAt)}
              </p>
            )
          ) : null}
          {isAuthorized &&
          shareDictionary[update.type as keyof typeof shareDictionary] ? (
            <ExternalLink
              href={shareOnX(
                shareDictionary[update.type as keyof typeof shareDictionary]
              )}
            >
              <ShareIcon className="text-gray-900 dark:text-zinc-300 w-5 h-5" />
            </ExternalLink>
          ) : null}
          {isAuthorized && update.type === "ProjectUpdate" ? (
            <>
              <button
                onClick={() => {
                  const url = new URL(
                    PAGES.PROJECT.UPDATES(
                      project?.details?.data.slug || project?.uid || ""
                    ),
                    window.location.origin
                  );
                  url.searchParams.set("tab", "post-update");
                  url.searchParams.set("editId", update.uid);
                  router.push(url.toString());
                }}
                className="bg-transparent p-0 w-max h-max text-black dark:text-white hover:bg-transparent hover:opacity-75"
              >
                <PencilSquareIcon className="w-5 h-5" />
              </button>
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
            </>
          ) : null}
        </div>
      </div>
      {update.type !== "ProjectImpact" &&
        (update.data && "title" in update.data && update.data.title ? (
          <p className="text-lg font-semibold text-black dark:text-zinc-100 max-sm:text-base">
            {update.data.title}
          </p>
        ) : null)}
      <div className="relative flex justify-between items-end">
        <div className="flex-grow">
          <ReadMore
            readLessText="Read less update"
            readMoreText="Read full update"
            markdownClass="text-black font-normal text-base"
            side="left"
            othersideButton={
              update.type != "ProjectUpdate" &&
              update.type != "ProjectImpact" ? (
                <Link
                  href={PAGES.PROJECT.MILESTONES_AND_UPDATES(
                    project?.details?.data.slug || "",
                    update.refUID
                  )}
                  className="underline text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline"
                >
                  {
                    project?.grants?.find(
                      (grant) =>
                        grant.uid?.toLowerCase() ===
                        update.refUID?.toLowerCase()
                    )?.details?.data.title
                  }
                </Link>
              ) : update.type === "ProjectImpact" ? (
                <Link
                  href={PAGES.PROJECT.IMPACT.ROOT(
                    project?.details?.data.slug || project?.uid || ""
                  )}
                  className="underline text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline"
                >
                  See impact
                </Link>
              ) : null
            }
          >
            {(() => {
              switch (update.type) {
                case "ProjectUpdate":
                case "GrantUpdate":
                  return update.data.text;
                case "Milestone":
                  return "description" in update.data
                    ? update.data.description
                    : "";
                case "ProjectImpact":
                  const data = update.data as IProjectImpact["data"];
                  const { impact, proof, work } = data;
                  return `### Work \n${work} \n\n### Impact \n${impact} \n\n### Proof \n${proof}`;
                default:
                  return "";
              }
            })()}
          </ReadMore>
        </div>
      </div>
      {update.type === "ProjectUpdate" ? (
        (update as IProjectUpdate).data?.indicators?.length ||
        (update as IProjectUpdate).data?.deliverables?.length ? (
          <ProjectActivityBlock activity={update as IProjectUpdate} />
        ) : null
      ) : null}
    </div>
  );
};

const ProjectUpdateFormBlock = () => {
  const [, changeTab] = useQueryState("tab");
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const project = useProjectStore((state) => state.project);
  const updateBeingEdited = editId
    ? project?.updates.find((update) => update.uid === editId)
    : null;
  const router = useRouter();

  const handleClose = () => {
    // Navigate to the updates tab without the editId parameter
    const url = new URL(window.location.href);
    url.searchParams.delete("editId");
    url.searchParams.set("tab", "updates");
    router.push(url.toString());
  };

  return (
    <div className="flex w-full flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-900  px-4 py-6 max-lg:max-w-full">
      <div className="flex w-full flex-row justify-between">
        <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
          {updateBeingEdited
            ? `Editing ${updateBeingEdited.data.title}`
            : "Post a project activity"}
        </h4>
        <button
          className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
          onClick={handleClose}
        >
          <img src="/icons/close.svg" alt="Close" className="h-5 w-5" />
        </button>
      </div>
      <ProjectUpdateForm afterSubmit={handleClose} />
    </div>
  );
};

const UpdatesTab: FC = () => {
  const { project } = useProjectStore();

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;
  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "info",
  });

  const [allUpdates, setAllUpdates] = useState<any[]>([]);

  useEffect(() => {
    const updates: IProjectUpdate[] = project?.updates || [];
    const grantUpdates: IGrantUpdate[] = [];
    const grantMilestones: IMilestoneResponse[] = [];
    const projectImpacts: IProjectImpact[] = project?.impacts || [];
    project?.grants.forEach((grant) => {
      grantUpdates.push(...grant.updates);
      grantMilestones.push(...grant.milestones);
    });
    const sortedUpdates = [
      ...updates,
      ...grantUpdates,
      ...grantMilestones,
      ...projectImpacts,
    ].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    setAllUpdates(sortedUpdates);
  }, [project?.grants, project?.updates, project?.impacts]);

  return (
    <div id="updates-tab" className="flex flex-col gap-6">
      <div className="flex flex-row gap-4 justify-between">
        <p className="font-bold text-black dark:text-zinc-200 text-base">
          Updates {allUpdates.length ? `(${allUpdates.length})` : ""}
        </p>
        {isAuthorized ? (
          <Button
            onClick={() => setActiveTab("post-update")}
            className="flex h-max w-max dark:bg-zinc-900 dark:text-white text-zinc-900 flex-row items-center justify-center gap-3 rounded border border-black bg-transparent px-3 py-1 text-sm font-semibold hover:bg-transparent hover:opacity-75"
          >
            Post a Project Activity
          </Button>
        ) : null}
      </div>
      {allUpdates.length ? (
        <div className="flex flex-col gap-6">
          {allUpdates.map((update, index) => (
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
                  Go ahead and create your first project activity
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
                  Post a Project Activity
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
                    Welcome to the Project Activities section!
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
  "post-update": ProjectUpdateFormBlock,
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
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

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
