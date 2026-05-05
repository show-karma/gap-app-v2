"use client";

import { type FC, useMemo } from "react";
import { ActivityCard } from "@/components/Shared/ActivityCard";
import { useIsCommunityAdmin } from "@/src/core/rbac/context/permission-context";
import { useOwnerStore, useProjectStore } from "@/store";
import { useGrantStore } from "@/store/grant";
import type { GrantMilestone } from "@/types/v2/grant";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

/**
 * Helper to get the completion object from a milestone.
 * API may return completion as an object or an array.
 */
export const getCompletionData = (milestone: GrantMilestone) => {
  const completed = milestone.completed;
  if (!completed) return null;

  if (Array.isArray(completed)) {
    if (completed.length === 0) return null;
    const firstItem = completed[0];
    return {
      ...firstItem,
      createdAt: firstItem?.createdAt ?? (completed as any).createdAt,
      updatedAt: firstItem?.updatedAt ?? (completed as any).updatedAt,
    };
  }

  return completed;
};

export const isMilestoneCompleted = (milestone: GrantMilestone): boolean =>
  getCompletionData(milestone) !== null;

type GrantContext =
  | {
      uid?: string;
      chainID?: number;
      communityUID?: string;
      details?: { title?: string; programId?: string };
    }
  | null
  | undefined;

function toUnifiedMilestone(milestone: GrantMilestone, grant: GrantContext): UnifiedMilestone {
  const completion = getCompletionData(milestone);
  const chainID = milestone.chainID || grant?.chainID || 0;
  const refUID = milestone.refUID || grant?.uid || "";

  const normalizedCompleted = completion
    ? {
        uid: completion.uid,
        chainID: completion.chainID,
        createdAt: completion.createdAt || (milestone as any).updatedAt || "",
        updatedAt: completion.updatedAt,
        attester: completion.attester,
        data: {
          proofOfWork: completion.data?.proofOfWork,
          reason: completion.data?.reason,
          completionPercentage: completion.data?.completionPercentage,
          deliverables: (completion.data as any)?.deliverables,
        },
      }
    : null;

  const completed = normalizedCompleted
    ? {
        createdAt: normalizedCompleted.createdAt,
        data: normalizedCompleted.data,
      }
    : false;

  const normalizedMilestone: GrantMilestone = {
    ...milestone,
    completed: normalizedCompleted,
  };

  return {
    uid: milestone.uid,
    type: "grant",
    title: milestone.title,
    description: milestone.description,
    completed,
    createdAt: (milestone as any).createdAt || "",
    startsAt: milestone.startsAt,
    endsAt: milestone.endsAt,
    chainID,
    refUID,
    invoiceInfo: milestone.invoiceInfo ?? undefined,
    source: {
      type: "grant",
      grantMilestone: {
        completionDetails: null,
        milestone: normalizedMilestone,
        grant: {
          uid: refUID,
          chainID,
          details: grant?.details,
          communityUID: grant?.communityUID,
        } as any,
      },
    },
  };
}

interface MilestoneDetailsProps {
  milestone: GrantMilestone;
  allocationAmount?: string;
  grantMilestoneOrder?: { index: number; total: number };
  /** Milestone index within a list (used by legacy callers) */
  index?: number;
}

export const MilestoneDetails: FC<MilestoneDetailsProps> = ({
  milestone,
  allocationAmount,
  grantMilestoneOrder,
}) => {
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useIsCommunityAdmin();
  const isAuthorized = isProjectOwner || isProjectAdmin || isContractOwner || isCommunityAdmin;

  const grant = useGrantStore((state) => state.grant);

  const unifiedMilestone = useMemo(() => {
    const base = toUnifiedMilestone(milestone, grant);
    return grantMilestoneOrder ? { ...base, grantMilestoneOrder } : base;
  }, [milestone, grant, grantMilestoneOrder]);

  return (
    <>
      {allocationAmount && (
        <span data-testid="milestone-allocation-amount" className="sr-only">
          {allocationAmount}
        </span>
      )}
      <ActivityCard
        activity={{
          type: "milestone",
          data: unifiedMilestone,
          allocationAmount,
          hideTimelineMarker: true,
        }}
        isAuthorized={isAuthorized}
      />
    </>
  );
};
