import { FC } from "react";
import { ActivityStatus } from "./ActivityStatus";
import { ActivityType } from "./ActivityTypes";
import { GrantAssociation } from "./GrantAssociation";
import {
  IGrantUpdate,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { UnifiedMilestone } from "@/types/roadmap";

interface ActivityStatusHeaderProps {
  /** The activity type to display in the left status pill */
  activityType: ActivityType;
  /** Optional due date to display on the right */
  dueDate?: string | null;
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
  /** Whether to show grant association */
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
  return (
    <div className="w-full flex flex-row gap-2">
      <div className="flex flex-row items-center justify-between w-full flex-wrap gap-2">
        <div className="flex flex-row items-center gap-2 w-full flex-1 flex-wrap">
          <GrantAssociation
            update={update}
            index={index}
            milestone={milestone}
          />
          <ActivityStatus type={activityType} />
          {dueDate && (
            <span className="text-sm font-semibold text-brand-gray dark:text-gray-400">
              Due by {dueDate}
            </span>
          )}
        </div>

        {showCompletionStatus && (
          <ActivityStatus
            type="Milestone"
            completed={completed}
            className={completionStatusClassName}
          />
        )}
      </div>
    </div>
  );
};
