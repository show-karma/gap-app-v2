import { FC } from "react";
import { ActivityStatus } from "./ActivityStatus";

interface ActivityStatusHeaderProps {
  /** The activity type to display in the left status pill */
  activityType: string;
  /** Optional due date to display on the right */
  dueDate?: string | null;
  /** Whether to show completion status for milestones */
  showCompletionStatus?: boolean;
  /** Whether the milestone/activity is completed */
  completed?: boolean;
  /** Additional className for the completion status pill */
  completionStatusClassName?: string;
}

export const ActivityStatusHeader: FC<ActivityStatusHeaderProps> = ({
  activityType,
  dueDate,
  showCompletionStatus = false,
  completed = false,
  completionStatusClassName = "text-xs px-2 py-1",
}) => {
  return (
    <div className="flex flex-row items-center justify-between w-full">
      <div className="flex flex-row items-center gap-2">
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
  );
};
