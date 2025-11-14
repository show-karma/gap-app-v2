import type {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types"
import type { FC } from "react"
import type { UnifiedMilestone } from "@/types/roadmap"
import { ActivityCard } from "./ActivityCard"

type UpdateType =
  | IProjectUpdate
  | IGrantUpdate
  | IMilestoneResponse
  | IProjectImpact
  | IProjectMilestoneResponse

interface ActivityListProps {
  updates?: UpdateType[]
  milestones?: UnifiedMilestone[]
  isAuthorized?: boolean
}

export const ActivityList: FC<ActivityListProps> = ({
  updates = [],
  milestones = [],
  isAuthorized = false,
}) => {
  // Sort all activities by date (most recent first)
  const allActivities = [
    ...updates.map((update, index) => ({
      type: "update" as const,
      data: update,
      date: new Date(update.createdAt).getTime(),
      index,
    })),
    ...milestones.map((milestone) => ({
      type: "milestone" as const,
      data: milestone,
      date: new Date(milestone.createdAt).getTime(),
    })),
  ].sort((a, b) => b.date - a.date)

  return (
    <div className="flex flex-col gap-4">
      {allActivities.length > 0 ? (
        allActivities.map((activity, idx) => (
          <ActivityCard
            key={`activity-${activity.type}-${idx}`}
            activity={activity}
            isAuthorized={isAuthorized}
          />
        ))
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No activities to display
        </div>
      )}
    </div>
  )
}
