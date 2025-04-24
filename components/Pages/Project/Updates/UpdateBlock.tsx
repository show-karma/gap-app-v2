/* eslint-disable @next/next/no-img-element */
import { DeleteDialog } from "@/components/DeleteDialog";
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
import {
  PencilSquareIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Bars4Icon } from "@heroicons/react/24/solid";
import {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { ButtonHTMLAttributes, FC, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { errorManager } from "@/components/Utilities/errorManager";

import { PAGES } from "@/utilities/pages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { ProjectActivityBlock } from "./ProjectActivityBlock";

export const UpdateBlock = ({
  update,
  index,
}: {
  update:
    | IProjectUpdate
    | IGrantUpdate
    | IMilestoneResponse
    | IProjectImpact
    | IProjectMilestoneResponse;
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
      console.log(error);
      toast.error(MESSAGES.PROJECT_UPDATE_FORM.DELETE.ERROR);
      errorManager(
        `Error deleting project activity ${update.uid} from project ${project?.uid}`,
        error
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
    ProjectMilestone: "MILESTONE",
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
    ProjectMilestone: SHARE_TEXTS.GRANT_UPDATE(
      project?.details?.data?.title as string,
      project?.uid as string,
      update.uid
    ),
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-4 rounded-lg dark:bg-zinc-800 bg-[#F8F9FC] p-4 transition-all duration-200 ease-in-out max-sm:px-2">
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
          ) : update.type === "ProjectMilestone" ? (
            <p className="text-sm font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
              {update.type === "ProjectMilestone" &&
              "completed" in update &&
              update.completed
                ? `Completed on ${formatDate(update.completed.createdAt)}`
                : `Posted on ${formatDate(update.createdAt)}`}
            </p>
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
              update.type != "ProjectImpact" &&
              update.type != "ProjectMilestone" ? (
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
              ) : update.type === "ProjectMilestone" &&
                "completed" in update &&
                update.completed?.data.proofOfWork ? (
                <Link
                  href={update.completed.data.proofOfWork}
                  className="underline text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View proof
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
                case "ProjectMilestone":
                  return update.data.text || "";
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
