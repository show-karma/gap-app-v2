/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/community";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import {
  IMilestoneCompleted,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { MilestoneUpdateForm } from "@/components/Forms/MilestoneUpdate";

interface NotUpdatingCaseProps {
  milestone: IMilestoneResponse;
  isAuthorized: boolean;
  setIsUpdating: (value: boolean) => void;
}

const NotUpdatingCase: FC<NotUpdatingCaseProps> = ({
  milestone,
  isAuthorized,
  setIsUpdating,
}) => {
  if (!isAuthorized) {
    return undefined;
  }
  return (
    <div className="flex flex-row items-center justify-end ">
      {!milestone.completed && !milestone.approved && milestone ? (
        <Button
          className="flex items-center justify-center gap-2 rounded border border-blue-600 bg-brand-blue dark:bg-primary-700 dark:text-zinc-200 px-4 py-2.5 hover:bg-brand-blue"
          onClick={() => setIsUpdating(true)}
        >
          <p className="text-sm font-semibold text-white">Post an update</p>
          <PencilSquareIcon className="relative h-5 w-5" />
        </Button>
      ) : null}
    </div>
  );
};

interface UpdateMilestoneProps {
  milestone: IMilestoneResponse;
  isEditing: boolean;
  previousData?: IMilestoneCompleted["data"];
  cancelEditing: (value: boolean) => void;
}

export const UpdateMilestone: FC<UpdateMilestoneProps> = ({
  milestone,
  isEditing,
  previousData,
  cancelEditing,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;

  return isUpdating || isEditing ? (
    <MilestoneUpdateForm
      milestone={milestone}
      isEditing={isEditing}
      cancelEditing={cancelEditing}
      previousData={previousData}
    />
  ) : (
    <NotUpdatingCase
      isAuthorized={isAuthorized}
      milestone={milestone}
      setIsUpdating={setIsUpdating}
    />
  );
};
