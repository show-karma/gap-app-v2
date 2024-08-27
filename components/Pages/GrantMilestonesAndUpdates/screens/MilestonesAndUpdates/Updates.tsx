/* eslint-disable @next/next/no-img-element */
import { type FC, useState, useEffect } from "react";

import { Button } from "@/components/Utilities/Button";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { UpdateMilestone } from "./UpdateMilestone";
import { useOwnerStore, useProjectStore } from "@/store";
import toast from "react-hot-toast";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSwitchChain, useAccount } from "wagmi";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { formatDate } from "@/utilities/formatDate";
import { ReadMore } from "@/utilities/ReadMore";
import { getWalletClient } from "@wagmi/core";
import { VerifyMilestoneUpdateDialog } from "./VerifyMilestoneUpdateDialog";
import { VerifiedBadge } from "./VerifiedBadge";
import { useCommunityAdminStore } from "@/store/community";
import { useStepper } from "@/store/modals/txStepper";
import { config } from "@/utilities/wagmi/config";
import {
  IMilestoneCompleted,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getGapClient, useGap } from "@/hooks";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

import { errorManager } from "@/components/Utilities/errorManager";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

interface UpdatesProps {
  milestone: IMilestoneResponse;
}

export const Updates: FC<UpdatesProps> = ({ milestone }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditing = (value: boolean) => {
    setIsEditing(value);
  };
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const { changeStepperStep, setIsStepper } = useStepper();
  const { gap } = useGap();
  const project = useProjectStore((state) => state.project);

  const undoMilestoneCompletion = async (milestone: IMilestoneResponse) => {
    let gapClient = gap;
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchChainAsync?.({ chainId: milestone.chainID });
        gapClient = getGapClient(milestone.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: milestone.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      // const instanceMilestone = new Milestone({
      //   ...milestone,
      //   schema: gapClient.findSchema("Milestone"),
      // });
      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const findGrant = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === milestone.refUID.toLowerCase()
      );
      const instanceMilestone = findGrant?.milestones.find(
        (item) => item.uid.toLowerCase() === milestone.uid.toLowerCase()
      );
      if (!instanceMilestone) return;
      await instanceMilestone
        .revokeCompletion(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, instanceMilestone.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const foundGrant = fetchedProject?.grants.find(
                  (g) => g.uid === milestone.refUID
                );
                const fetchedMilestone = foundGrant?.milestones.find(
                  (u: any) => u.uid === milestone.uid
                );
                const isCompleted = fetchedMilestone?.completed;
                if (!isCompleted) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.MILESTONES.COMPLETE.UNDO.SUCCESS);
                }
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              })
              .catch(async () => {
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              });
          }
        });
    } catch (error: any) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.COMPLETE.UNDO.ERROR);
      errorManager(
        `Error deleting milestone completion of ${milestone.uid} from grant ${milestone.refUID}`,
        error
      );
    } finally {
      setIsStepper(false);
    }
  };

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;

  const [verifiedMilestones, setVerifiedMilestones] = useState<
    IMilestoneCompleted[]
  >(milestone?.verified || []);

  const addVerifiedMilestone = (newVerified: IMilestoneCompleted) => {
    setVerifiedMilestones([...verifiedMilestones, newVerified]);
  };

  useEffect(() => {
    setVerifiedMilestones(milestone?.verified || []);
  }, [milestone]);
  if (
    !isEditing &&
    (milestone?.completed?.data?.reason?.length ||
      milestone?.completed?.data?.proofOfWork)
  ) {
    return (
      <div className="flex flex-col gap-3 bg-[#F8F9FC] dark:bg-zinc-900 rounded-md px-4 py-2 max-lg:max-w-2xl max-sm:max-w-full">
        <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex flex-row gap-4 items-center flex-wrap">
            <div className="flex items-center h-max w-max flex-row gap-2 rounded-full bg-[#5720B7] dark:bg-purple-900 px-3 py-1">
              <img
                className="h-4 w-4"
                alt="Update"
                src="/icons/alert-message-white.svg"
              />
              <p className="text-xs font-bold text-white">UPDATE</p>
            </div>
            {verifiedMilestones.length ? (
              <VerifiedBadge
                verifications={verifiedMilestones}
                title={`${milestone.data.title} - Reviews`}
              />
            ) : null}
            <VerifyMilestoneUpdateDialog
              milestone={milestone}
              addVerifiedMilestone={addVerifiedMilestone}
            />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-100">
            Posted on {formatDate(milestone?.completed?.createdAt)}
          </p>
        </div>

        {milestone.completed?.data?.reason ||
        milestone.completed?.data?.proofOfWork ? (
          <div className="flex flex-col items-start " data-color-mode="light">
            <ReadMore
              readLessText="Read less"
              readMoreText="Read more"
              side="left"
            >
              {milestone.completed.data?.reason || ""}
            </ReadMore>

            <div className="flex w-full flex-row items-center justify-between">
              {milestone.completed.data?.proofOfWork ? (
                <ExternalLink
                  href={
                    milestone.completed.data?.proofOfWork.includes("http")
                      ? milestone.completed.data?.proofOfWork
                      : `https://${milestone.completed.data?.proofOfWork}`
                  }
                  className="flex flex-row w-max gap-2 bg-transparent text-sm font-semibold text-blue-600 underline dark:text-blue-100 hover:bg-transparent"
                >
                  View Proof of Work
                </ExternalLink>
              ) : null}
              <div className="flex flex-1 flex-row items-center justify-end">
                {isAuthorized ? (
                  <div className="flex w-max flex-row items-center gap-2">
                    <Button
                      type="button"
                      className="flex flex-row gap-2 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent"
                      onClick={() => handleEditing(true)}
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      className="flex flex-row gap-2 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent"
                      onClick={() => undoMilestoneCompletion(milestone)}
                    >
                      <TrashIcon className="h-5 w-5" />
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <UpdateMilestone
      milestone={milestone}
      isEditing={isEditing}
      previousData={milestone.completed?.data}
      cancelEditing={handleEditing}
    />
  );
};
