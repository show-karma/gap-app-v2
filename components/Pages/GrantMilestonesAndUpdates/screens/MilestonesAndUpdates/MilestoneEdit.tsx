"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { type FC, useMemo, useState } from "react";
import { MilestoneEditDialog } from "@/components/Milestone/MilestoneEditDialog";
import { useGrantStore } from "@/store/grant";
import type { GrantMilestone } from "@/types/v2/grant";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

interface MilestoneEditProps {
  milestone: GrantMilestone;
}

function toUnifiedMilestone(
  milestone: GrantMilestone,
  grantUID: string,
  grantChainID: number
): UnifiedMilestone {
  const chainID = milestone.chainID || grantChainID;
  const refUID = milestone.refUID || grantUID;
  return {
    uid: milestone.uid,
    type: "milestone",
    title: milestone.title,
    description: milestone.description,
    completed: false,
    createdAt: "",
    startsAt: milestone.startsAt,
    endsAt: milestone.endsAt,
    chainID,
    refUID,
    source: {
      grantMilestone: {
        milestone,
        completionDetails: null,
        grant: {
          uid: refUID,
          chainID,
        },
      },
    },
  };
}

export const MilestoneEdit: FC<MilestoneEditProps> = ({ milestone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const grant = useGrantStore((state) => state.grant);
  const grantChainID = grant?.chainID || 0;
  const grantUID = grant?.uid || "";
  const unifiedMilestone = useMemo(
    () => toUnifiedMilestone(milestone, grantUID, grantChainID),
    [milestone, grantUID, grantChainID]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-transparent p-0 w-max h-max hover:bg-transparent"
        title="Edit milestone"
      >
        <PencilSquareIcon className="w-5 h-5" />
      </button>
      <MilestoneEditDialog
        milestone={unifiedMilestone}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
