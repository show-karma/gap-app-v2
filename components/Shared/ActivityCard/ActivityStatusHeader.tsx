import type {
  IGrantUpdate,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC } from "react";
import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { formatDate } from "@/utilities/formatDate";
import {
  getEffectiveMilestoneStatus,
  isCancelledMilestoneStatus,
} from "@/utilities/milestones/getEffectiveMilestoneStatus";
import {
  type MilestoneDueDateInput,
  normalizeMilestoneDueDateMs,
} from "@/utilities/milestones/milestoneDueDate";
import { ActivityStatus } from "./ActivityStatus";
import type { ActivityType } from "./ActivityTypes";
import { GrantAssociation } from "./GrantAssociation";

interface ActivityStatusHeaderProps {
  /** The activity type to display in the left status pill */
  activityType: ActivityType;
  /**
   * Raw due date. A single value drives both the displayed "Due by …" date and
   * the past-due status derivation, so the two can never disagree. Accepts an
   * ISO string, epoch seconds/ms, or a Date; corrupted/missing values render no
   * due date and never a spurious past-due pill.
   */
  dueDate?: MilestoneDueDateInput;
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
  showCompletionStatus = false,
  completed = false,
  completionStatusClassName = "text-xs px-2 py-1",
  update,
  index,
  milestone,
}) => {
  const dueMs = normalizeMilestoneDueDateMs(dueDate);
  const effectiveStatus = getEffectiveMilestoneStatus(
    isCancelledMilestoneStatus(milestone?.currentStatus)
      ? MilestoneLifecycleStatus.CANCELLED
      : completed
        ? MilestoneLifecycleStatus.COMPLETED
        : MilestoneLifecycleStatus.PENDING,
    dueMs
  );

  return (
    <div className="w-full flex flex-row gap-2">
      <div className="flex flex-row items-center justify-between w-full flex-wrap gap-2">
        <div className="flex flex-row items-center gap-2 w-full flex-1 flex-wrap">
          <ActivityStatus type={activityType} />
          <GrantAssociation update={update} index={index} milestone={milestone} />
          {dueMs != null && (
            <span className="text-sm font-semibold text-muted-foreground">
              Due by {formatDate(dueMs)}
            </span>
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
