/* eslint-disable @next/next/no-img-element */
import type { Milestone, MilestoneCompleted } from "@show-karma/karma-gap-sdk";
import { type FC, useState, useEffect } from "react";

import { Button } from "@/components/Utilities/Button";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { UpdateMilestone } from "./UpdateMilestone";
import { useOwnerStore, useProjectStore } from "@/store";
import toast from "react-hot-toast";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useNetwork, useSwitchNetwork } from "wagmi";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { formatDate } from "@/utilities/formatDate";
import { ReadMore } from "@/utilities/ReadMore";
import { getWalletClient } from "@wagmi/core";
import { VerifyMilestoneUpdateDialog } from "./VerifyMilestoneUpdateDialog";
import { VerifiedBadge } from "./VerifiedBadge";
import { useCommunityAdminStore } from "@/store/community";

interface UpdatesProps {
  milestone: Milestone;
}

export const Updates: FC<UpdatesProps> = ({ milestone }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditing = (value: boolean) => {
    setIsEditing(value);
  };
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const signer = useSigner();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const undoMilestoneCompletion = async (milestone: Milestone) => {
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchNetworkAsync?.(milestone.chainID);
      }
      const walletClient = await getWalletClient({
        chainId: milestone.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      await milestone.revokeCompletion(walletSigner as any).then(async () => {
        toast.success(MESSAGES.MILESTONES.COMPLETE.UNDO.SUCCESS);
        await refreshProject();
      });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.COMPLETE.UNDO.ERROR);
    }
  };

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;

  const [verifiedMilestones, setVerifiedMilestones] = useState<
    MilestoneCompleted[]
  >(milestone?.verified || []);

  const addVerifiedMilestone = (newVerified: MilestoneCompleted) => {
    setVerifiedMilestones([...verifiedMilestones, newVerified]);
  };

  useEffect(() => {
    setVerifiedMilestones(milestone?.verified || []);
  }, [milestone]);

  if (!isEditing && milestone?.completed.reason?.length) {
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
                milestoneName={milestone.title}
              />
            ) : null}
            <VerifyMilestoneUpdateDialog
              milestone={milestone}
              addVerifiedMilestone={addVerifiedMilestone}
              isCommunityAdmin={isCommunityAdmin}
            />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-100">
            Posted on {formatDate(milestone?.completed?.createdAt)}
          </p>
        </div>

        {milestone.completed?.reason ? (
          <div className="flex flex-col items-start " data-color-mode="light">
            <ReadMore
              readLessText="Read less"
              readMoreText="Read more"
              side="left"
            >
              {milestone.completed.reason}
            </ReadMore>

            <div className="flex w-full flex-row items-center justify-end">
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
        ) : null}
      </div>
    );
  }

  return (
    <UpdateMilestone
      milestone={milestone}
      isEditing={isEditing}
      previousDescription={milestone.completed?.reason || ""}
      cancelEditing={handleEditing}
    />
  );
};
