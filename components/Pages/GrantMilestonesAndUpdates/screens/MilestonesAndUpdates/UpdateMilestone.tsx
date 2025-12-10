/* eslint-disable @next/next/no-img-element */
"use client";

import { PencilSquareIcon, ShareIcon } from "@heroicons/react/24/outline";
import type { IMilestoneCompleted } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { type FC, useState } from "react";
import { MilestoneUpdateForm } from "@/components/Forms/MilestoneUpdate";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Button } from "@/components/ui/button";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import type { GrantMilestone } from "@/types/v2/grant";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";

interface NotUpdatingCaseProps {
  milestone: GrantMilestone;
  isAuthorized: boolean;
  setIsUpdating: (value: boolean) => void;
}

const NotUpdatingCase: FC<NotUpdatingCaseProps> = ({ milestone, isAuthorized, setIsUpdating }) => {
  const project = useProjectStore((state) => state.project);

  // Fetch grants using dedicated hook
  const { grants } = useProjectGrants(project?.uid || "");

  const grant = grants.find((g) => g.uid.toLowerCase() === (milestone.refUID?.toLowerCase() ?? ""));

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
                grant?.details?.title as string,
                (project?.details?.slug || project?.uid) as string,
                grant?.uid as string
              )
            )}
          >
            <p className="text-sm font-semibold text-gray-600 dark:text-zinc-100">Share</p>
            <ShareIcon className="relative h-5 w-5" />
          </ExternalLink>
          <Button
            className="flex items-center justify-center gap-2 rounded border border-blue-600 px-4 py-2.5"
            onClick={() => setIsUpdating(true)}
          >
            Post an update
            <PencilSquareIcon className="relative h-5 w-5" />
          </Button>
        </>
      ) : null}
    </div>
  );
};

interface UpdateMilestoneProps {
  milestone: GrantMilestone;
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
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;
  return isUpdating || isEditing ? (
    <MilestoneUpdateForm
      milestone={milestone}
      isEditing={isEditing}
      cancelEditing={cancelEditing}
      previousData={previousData}
      setIsUpdating={setIsUpdating}
    />
  ) : (
    <NotUpdatingCase
      isAuthorized={isAuthorized}
      milestone={milestone}
      setIsUpdating={setIsUpdating}
    />
  );
};
