/* eslint-disable @next/next/no-img-element */
import type { Milestone } from "@show-karma/karma-gap-sdk";
import { type FC, useState } from "react";

import { Button } from "@/components/Utilities/Button";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { MESSAGES, ReadMore, formatDate, useSigner } from "@/utilities";
import { UpdateMilestone } from "./UpdateMilestone";
import { useOwnerStore, useProjectStore } from "@/store";
import toast from "react-hot-toast";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useNetwork, useSwitchNetwork } from "wagmi";

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
      await milestone.revokeCompletion(signer as any).then(async () => {
        toast.success(MESSAGES.MILESTONES.COMPLETE.UNDO.SUCCESS);
        await refreshProject();
      });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.COMPLETE.UNDO.ERROR);
    }
  };

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner;

  if (milestone?.completed?.reason && !isEditing) {
    return (
      <div className="flex flex-col gap-3 bg-[#F8F9FC] px-4 py-2 max-lg:max-w-2xl max-sm:max-w-[300px]">
        <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex w-max flex-row gap-2 rounded-full bg-[#5720B7] px-3 py-1">
            <img
              className="h-4 w-4"
              alt="Update"
              src="/icons/alert-message-white.svg"
            />
            <p className="text-xs font-bold text-white">UPDATE</p>
          </div>
          <p className="text-sm font-semibold text-gray-500 ">
            Posted on {formatDate(milestone.completed.createdAt)}
          </p>
        </div>

        <div className="flex flex-col items-start " data-color-mode="light">
          <ReadMore readLessText="Read less" readMoreText="Read more">
            {milestone.completed.reason}
          </ReadMore>

          <div className="flex w-full flex-row items-center justify-end">
            {isAuthorized ? (
              <div className="flex w-max flex-row items-center gap-2">
                <Button
                  type="button"
                  className="flex flex-row gap-2 bg-transparent text-sm font-semibold text-gray-600 hover:bg-transparent"
                  onClick={() => handleEditing(true)}
                >
                  <PencilSquareIcon className="h-5 w-5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  className="flex flex-row gap-2 bg-transparent text-sm font-semibold text-gray-600 hover:bg-transparent"
                  onClick={() => undoMilestoneCompletion(milestone)}
                >
                  <img
                    src="/icons/trash.svg"
                    alt="Remove"
                    className="h-5 w-5"
                  />
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        </div>
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
