/* eslint-disable @next/next/no-img-element */
"use client";

import { MilestoneUpdateForm } from "@/components/Forms/MilestoneUpdate";
import { Button } from "@/components/Utilities/Button";
import { useOwnerStore } from "@/store";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { PencilSquareIcon, ShareIcon } from "@heroicons/react/24/outline";
import {
  IMilestoneCompleted,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { type FC, useState } from "react";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useProjectQuery } from "@/hooks/useProjectQuery";

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
  const { data: project } = useProjectQuery();
  const grant = project?.grants.find(
    (g) => g.uid.toLowerCase() === milestone.refUID.toLowerCase()
  );

  if (!isAuthorized) {
    return undefined;
  }
  return (
    <div className="flex flex-row items-center justify-end gap-2">
      {!milestone.completed && milestone ? (
        <>
          <ExternalLink
            className="flex items-center justify-center gap-2 rounded border border-gray-300 bg-transparent px-4 py-2.5 hover:bg-gray-50"
            href={shareOnX(
              SHARE_TEXTS.MILESTONE_PENDING(
                grant?.details?.data?.title as string,
                (project?.details?.data?.slug || project?.uid) as string,
                grant?.uid as string
              )
            )}
          >
            <p className="text-sm font-semibold text-gray-600 dark:text-zinc-100">
              Share
            </p>
            <ShareIcon className="relative h-5 w-5" />
          </ExternalLink>
          <Button
            className="flex items-center justify-center gap-2 rounded border border-blue-600 bg-brand-blue dark:bg-primary-700 dark:text-zinc-200 px-4 py-2.5 hover:bg-brand-blue"
            onClick={() => setIsUpdating(true)}
          >
            <p className="text-sm font-semibold text-white">Post an update</p>
            <PencilSquareIcon className="relative h-5 w-5" />
          </Button>
        </>
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
  const { isProjectAdmin } = useProjectPermissions();
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
