/* eslint-disable @next/next/no-img-element */

import type {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC } from "react";
import { useOwnerStore, useProjectStore } from "@/store";
import type { ConversionGrantUpdate, ProjectUpdate, UnifiedMilestone } from "@/types/v2/roadmap";
import { EndorsementCard } from "./ActivityCard/EndorsementCard";
import { FundingReceivedCard } from "./ActivityCard/FundingReceivedCard";
import { MilestoneCard } from "./ActivityCard/MilestoneCard";
import { ProjectUpdateCard } from "./ActivityCard/ProjectUpdateCard";
import { containerClassName } from "./ActivityCard/styles";
import { UpdateCard } from "./ActivityCard/UpdateCard";

type SdkUpdateType =
  | IProjectUpdate
  | IGrantUpdate
  | IMilestoneResponse
  | IProjectImpact
  | IProjectMilestoneResponse
  | ConversionGrantUpdate;

type ActivityType =
  | {
      type: "projectUpdate";
      data: ProjectUpdate;
      index: number;
    }
  | {
      type: "update";
      data: SdkUpdateType;
      index: number;
    }
  | {
      type: "milestone";
      data: UnifiedMilestone;
      allocationAmount?: string;
      hideTimelineMarker?: boolean;
    }
  | { type: "fundingReceived"; data: UnifiedMilestone; projectId?: string }
  | { type: "endorsement"; data: UnifiedMilestone };

interface ActivityCardProps {
  activity: ActivityType;
  isAuthorized?: boolean;
}

export const ActivityCard: FC<ActivityCardProps> = ({ activity, isAuthorized = false }) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthenticatedUser = isOwner || isProjectAdmin || isAuthorized;

  return (
    <div className="flex flex-col w-full">
      {activity.type === "projectUpdate" ? (
        <div className={containerClassName}>
          <ProjectUpdateCard
            update={activity.data}
            index={activity.index}
            isAuthorized={isAuthenticatedUser}
          />
        </div>
      ) : activity.type === "update" ? (
        <div className={containerClassName}>
          <UpdateCard
            update={activity.data}
            index={activity.index}
            isAuthorized={isAuthenticatedUser}
          />
        </div>
      ) : activity.type === "fundingReceived" ? (
        <div className={containerClassName}>
          <FundingReceivedCard milestone={activity.data} projectId={activity.projectId} />
        </div>
      ) : activity.type === "endorsement" ? (
        <div className={containerClassName}>
          <EndorsementCard milestone={activity.data} />
        </div>
      ) : (
        <MilestoneCard
          milestone={activity.data}
          isAuthorized={isAuthenticatedUser}
          allocationAmount={activity.allocationAmount}
          hideTimelineMarker={activity.hideTimelineMarker}
        />
      )}
    </div>
  );
};
