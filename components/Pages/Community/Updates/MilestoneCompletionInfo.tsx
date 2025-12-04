"use client";

import { type FC, memo } from "react";
import { containerClassName } from "@/components/Shared/ActivityCard";
import { ActivityAttribution } from "@/components/Shared/ActivityCard/ActivityAttribution";
import { ActivityStatusHeader } from "@/components/Shared/ActivityCard/ActivityStatusHeader";
import { ReadMore } from "@/utilities/ReadMore";
import { cn } from "@/utilities/tailwind";

interface MilestoneCompletionInfoProps {
  completionReason?: string;
  completionDate?: string;
  completedBy?: string;
}

const MilestoneCompletionInfoComponent: FC<MilestoneCompletionInfoProps> = ({
  completionReason,
  completionDate,
  completedBy,
}) => {
  if (!completionReason) return null;

  return (
    <div className={cn(containerClassName, "flex flex-col gap-1 w-full")}>
      <div className="w-full flex-col flex gap-2 px-5 py-4">
        <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-row items-center gap-3">
            <ActivityStatusHeader
              activityType="MilestoneUpdate"
              dueDate={null}
              showCompletionStatus={false}
              completed={true}
              completionStatusClassName="text-xs px-2 py-1"
            />
          </div>
        </div>
        {completionReason && (
          <div className="flex flex-col gap-1">
            <ReadMore side="left">{completionReason}</ReadMore>
          </div>
        )}
      </div>
      {completionDate && (
        <ActivityAttribution date={completionDate} attester={completedBy || ""} isCompleted />
      )}
    </div>
  );
};

export const MilestoneCompletionInfo = memo(MilestoneCompletionInfoComponent);
