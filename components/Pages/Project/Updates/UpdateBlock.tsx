/* eslint-disable @next/next/no-img-element */
import { DeleteDialog } from "@/components/DeleteDialog";
import { getGapClient, useGap } from "@/hooks/useGap";
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
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";

import { errorManager } from "@/components/Utilities/errorManager";

import { PAGES } from "@/utilities/pages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { ProjectActivityBlock } from "./ProjectActivityBlock";
import Image from "next/image";

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
    ProjectUpdate: "Project Activity",
    GrantUpdate: "Grant Update",
    Milestone: "Milestone",
    ProjectMilestone: "Milestone",
    ProjectImpact: "Project Impact",
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

  const getStatusColor = (label: keyof typeof labelDictionary) => {
    switch (label) {
      case "ProjectUpdate":
        return "bg-[#EFF4FF] text-black dark:bg-[#EFF4FF] dark:text-black";
      case "GrantUpdate":
        return "bg-[#DCFAE6] text-black dark:bg-[#DCFAE6] dark:text-black";
      case "ProjectImpact":
        return "bg-[#FBE8FF] text-black dark:bg-[#FBE8FF] dark:text-black";
      case "Milestone":
        return "bg-[#FFEFE0] text-black dark:bg-[#FFEFE0] dark:text-black";
      case "ProjectMilestone":
        return "bg-[#FFEFE0] text-black dark:bg-[#FFEFE0] dark:text-black";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    }
  };

  const getStatusIcon = (label: keyof typeof labelDictionary) => {
    switch (label) {
      case "ProjectUpdate":
        return "/icons/activity.svg";
      case "GrantUpdate":
        return "/icons/grant-update.svg";
      case "ProjectImpact":
        return "/icons/project-impact.svg";
      case "Milestone":
        return "/icons/milestone.svg";
      case "ProjectMilestone":
        return "/icons/milestone.svg";
      default:
        return "/icons/project-update.svg";
    }
  };

  const getStatusText = () => {
    return (
      labelDictionary[update.type as keyof typeof labelDictionary] || "UPDATE"
    );
  };

  return (
    <div
      className={cn(
        "border bg-white dark:bg-zinc-800 rounded-xl p-6 gap-3 flex flex-col items-start justify-start",
        "border-[#D0D5DD] dark:border-zinc-400"
      )}
    >
      <div className="flex flex-row gap-3 items-start justify-between w-full">
        <div className="flex flex-col w-full gap-3  items-start">
          <div className="flex flex-row gap-2">
            <span
              className={cn(
                "px-3 py-1.5 rounded-full text-sm w-max flex flex-row gap-2 font-semibold items-center",
                getStatusColor(update.type as keyof typeof labelDictionary)
              )}
            >
              <Image
                src={getStatusIcon(update.type as keyof typeof labelDictionary)}
                alt={getStatusText()}
                width={20}
                height={20}
              />
              {getStatusText()}
            </span>
            {update.type != "ProjectImpact" && update.type != "ProjectMilestone"
              ? (() => {
                  const grant = project?.grants?.find(
                    (grant) =>
                      grant.uid?.toLowerCase() === update.refUID?.toLowerCase()
                  );

                  const multipleGrants = project?.grants.filter((grant) =>
                    (update as IProjectUpdate)?.data?.grants?.some(
                      (grantId: string) =>
                        grantId.toLowerCase() === grant.uid.toLowerCase()
                    )
                  );

                  if (!grant && !multipleGrants?.length) return null;

                  if (multipleGrants?.length) {
                    return (
                      <div className="flex flex-wrap gap-2">
                        {multipleGrants.map((individualGrant) => (
                          <ExternalLink
                            href={PAGES.COMMUNITY.ALL_GRANTS(
                              individualGrant.community?.details?.data?.slug ||
                                "",
                              individualGrant.details?.data.programId
                            )}
                            key={`${individualGrant.uid}-${individualGrant.details?.data.title}-${update.uid}-${update.data?.title}-${index}`}
                            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                          >
                            {individualGrant.community?.details?.data
                              ?.imageURL ? (
                              <div className="w-4 h-4 relative overflow-hidden rounded-full">
                                <Image
                                  src={
                                    individualGrant.community?.details?.data
                                      ?.imageURL
                                  }
                                  alt={
                                    individualGrant.community?.details?.data
                                      ?.name || "Community"
                                  }
                                  width={16}
                                  height={16}
                                />
                              </div>
                            ) : null}
                            <span className="font-medium">
                              {individualGrant.details?.data.title ||
                                "Untitled Grant"}
                            </span>
                          </ExternalLink>
                        ))}
                      </div>
                    );
                  }

                  const communityData = grant?.community?.details?.data;

                  return (
                    <ExternalLink
                      href={PAGES.COMMUNITY.ALL_GRANTS(
                        communityData?.slug || grant?.community?.uid || "",
                        grant?.details?.data.programId || ""
                      )}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                    >
                      {communityData?.imageURL ? (
                        <div className="w-4 h-4 relative overflow-hidden rounded-full">
                          <Image
                            src={communityData.imageURL}
                            alt={communityData.name || "Community"}
                            width={16}
                            height={16}
                          />
                        </div>
                      ) : null}
                      <span className="font-medium">
                        {grant?.details?.data.title}
                      </span>
                    </ExternalLink>
                  );
                })()
              : null}
          </div>
          {update.type !== "ProjectImpact" &&
            update.data &&
            "title" in update.data &&
            update.data.title && (
              <p
                className="text-xl font-bold text-[#101828] dark:text-zinc-100 pl-4 border-l-4"
                style={{
                  borderLeftColor: "#2196F3",
                }}
              >
                {update.data.title}
              </p>
            )}
        </div>

        <div className="flex flex-row gap-2">
          {isAuthorized &&
            shareDictionary[update.type as keyof typeof shareDictionary] && (
              <ExternalLink
                href={shareOnX(
                  shareDictionary[update.type as keyof typeof shareDictionary]
                )}
              >
                <ShareIcon className="text-gray-900 dark:text-zinc-300 w-5 h-5" />
              </ExternalLink>
            )}
          {isAuthorized && update.type === "ProjectUpdate" && (
            <>
              <button
                onClick={() => {
                  const url = new URL(
                    PAGES.PROJECT.ROADMAP.ROOT(
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
          )}
        </div>
      </div>

      {update.type === "ProjectUpdate" && (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          {(update as any).data?.startDate || (update as any).data?.endDate ? (
            <span>
              {`${
                update.data?.startDate ? formatDate(update.data?.startDate) : ""
              } ${update.data?.startDate && update.data?.endDate ? "-" : ""} ${
                update.data?.endDate ? formatDate(update.data?.endDate) : ""
              }`}
            </span>
          ) : (
            <span>Posted on {formatDate(update.createdAt)}</span>
          )}
        </div>
      )}

      <div className="flex flex-col my-2 w-full">
        <ReadMore
          side="left"
          markdownClass="text-black dark:text-zinc-200 font-normal text-base"
          readLessText="Read less"
          readMoreText="Read more"
          othersideButton={
            update.type === "ProjectImpact" ? (
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

      <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-between w-full flex-wrap">
        <div className="flex flex-row gap-2 items-center flex-wrap">
          <p className="text-zinc-800 dark:text-zinc-300 text-sm lg:text-base">
            Posted on {formatDate(update.createdAt)}
            {update.attester ? " by" : ""}
          </p>
          {update.attester && (
            <div className="flex flex-row gap-1 items-center">
              <EthereumAddressToENSAvatar
                address={update.attester}
                className="h-5 w-5 min-h-5 min-w-5 rounded-full border-1 border-gray-100 dark:border-zinc-900"
              />
              <p className="text-sm text-center font-bold text-black dark:text-zinc-200 max-2xl:text-[13px]">
                <EthereumAddressToENSName address={update.attester} />
              </p>
            </div>
          )}
        </div>
      </div>

      {update.type === "ProjectUpdate" &&
      ((update as IProjectUpdate).data?.indicators?.length ||
        (update as IProjectUpdate).data?.deliverables?.length) ? (
        <div className="w-full flex-col flex gap-2 px-4 py-2 bg-[#F8F9FC] dark:bg-zinc-700 rounded-lg">
          <ProjectActivityBlock activity={update as IProjectUpdate} />
        </div>
      ) : null}
    </div>
  );
};
