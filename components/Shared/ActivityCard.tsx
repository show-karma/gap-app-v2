/* eslint-disable @next/next/no-img-element */
import { FC } from "react";
import { cn } from "@/utilities/tailwind";
import { useOwnerStore, useProjectStore } from "@/store";
import { UpdateCard } from "./ActivityCard/UpdateCard";
import { MilestoneCard } from "./ActivityCard/MilestoneCard";
import {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { UnifiedMilestone } from "@/types/roadmap";

type ActivityType =
  | {
      type: "update";
      data:
        | IProjectUpdate
        | IGrantUpdate
        | IMilestoneResponse
        | IProjectImpact
        | IProjectMilestoneResponse;
      index: number;
    }
  | { type: "milestone"; data: UnifiedMilestone };

interface ActivityCardProps {
  activity: ActivityType;
  isAuthorized?: boolean;
}

export const containerClassName =
  "border bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-400 rounded-xl gap-0 flex flex-col items-start justify-start";

export const ActivityCard: FC<ActivityCardProps> = ({
  activity,
  isAuthorized = false,
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthenticatedUser = isOwner || isProjectAdmin || isAuthorized;

  return (
    <div className="flex flex-col w-full">
      {activity.type === "update" ? (
        <div className={containerClassName}>
          <UpdateCard
            update={activity.data}
            index={activity.index}
            isAuthorized={isAuthenticatedUser}
          />
        </div>
      ) : (
        <MilestoneCard
          milestone={activity.data}
          isAuthorized={isAuthenticatedUser}
        />
      )}
    </div>
  );
};
