import type {
  IGrantUpdate,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC } from "react";
import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { getEffectiveMilestoneStatus } from "@/utilities/milestones/getEffectiveMilestoneStatus";
import { ActivityStatus } from "./ActivityStatus";
import type { ActivityType } from "./ActivityTypes";
import { GrantAssociation } from "./GrantAssociation";

interface ActivityStatusHeaderProps {
  /** The activity type to display in the left status pill */
  activityType: ActivityType;
  /** Pre-formatted due date string for display (right side) */
  dueDate?: string | null;
  /** Raw due date for computing past-due status. Accepts ISO string, epoch ms, or Date. */
  rawDueDate?: string | number | Date | null;
  /** Whether to show completion status for milestones */
  showCompletionStatus?: boolean;
  /** Whether the milestone/activity is completed */
  completed?: boolean;
  /** Additional className for the completion status pill */
  completionStatusClassName?: string;
  /** Update data for grant association */
  update?: IProjectUpdate | IGrantUpdate | any;
  /** Index for update data */
  index?: number;
  /** Milestone data for grant association */
  milestone?: UnifiedMilestone;
}

export const ActivityStatusHeader: FC<ActivityStatusHeaderProps> = ({
  activityType,
  dueDate,
  rawDueDate,
  showCompletionStatus = false,
  completed = false,
  completionStatusClassName = "text-xs px-2 py-1",
  update,
  index,
  milestone,
}) => {
  const effectiveStatus = getEffectiveMilestoneStatus(
    completed ? MilestoneLifecycleStatus.COMPLETED : MilestoneLifecycleStatus.PENDING,
    rawDueDate ?? null
  );

  return (
    <div className="w-full flex flex-row gap-2">
      <div className="flex flex-row items-center justify-between w-full flex-wrap gap-2">
        <div className="flex flex-row items-center gap-2 w-full flex-1 flex-wrap">
          <ActivityStatus type={activityType} />
          <GrantAssociation update={update} index={index} milestone={milestone} />
          {dueDate && (
            <span className="text-sm font-semibold text-muted-foreground">Due by {dueDate}</span>
          )}
        </div>

        {showCompletionStatus && (
          <ActivityStatus
            type="Milestone"
            milestoneStatus={effectiveStatus}
            className={completionStatusClassName}
          />
        )}
      </div>
    </div>
  );
};
