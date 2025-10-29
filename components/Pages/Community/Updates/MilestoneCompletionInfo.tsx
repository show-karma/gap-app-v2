"use client";

import { FC, memo } from "react";
import { ReadMore } from "@/utilities/ReadMore";
import { cn } from "@/utilities/tailwind";
import { ActivityStatusHeader } from "@/components/Shared/ActivityCard/ActivityStatusHeader";
import { ActivityAttribution } from "@/components/Shared/ActivityCard/ActivityAttribution";
import { containerClassName } from "@/components/Shared/ActivityCard";
import type {
  MilestoneDeliverable,
  MilestoneIndicator,
} from "@/types/community-updates";

interface MilestoneCompletionInfoProps {
  completionReason?: string;
  deliverables?: MilestoneDeliverable[];
  indicators?: MilestoneIndicator[];
  completionDate?: string;
}

const MilestoneCompletionInfoComponent: FC<MilestoneCompletionInfoProps> = ({
  completionReason,
  deliverables,
  indicators,
  completionDate,
}) => {
  const hasCompletionData =
    completionReason || deliverables?.length || indicators?.length;

  if (!hasCompletionData) return null;

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

        {deliverables && deliverables.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Deliverables:
            </p>
            {deliverables.map((deliverable, index) => (
              <div
                key={`${deliverable.name}-${index}`}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 bg-gray-50 dark:bg-zinc-800"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {deliverable.name}
                  </p>
                  {deliverable.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {deliverable.description}
                    </p>
                  )}
                  {deliverable.proof && (
                    <a
                      href={deliverable.proof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-blue hover:underline text-sm break-all"
                    >
                      {deliverable.proof}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {indicators && indicators.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Metrics:
            </p>
            {indicators.map((indicator, index) => (
              <div
                key={`${indicator.indicatorId}-${index}`}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 bg-gray-50 dark:bg-zinc-800"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {indicator.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {completionDate && (
        <ActivityAttribution
          date={completionDate}
          attester=""
          isCompleted
        />
      )}
    </div>
  );
};

export const MilestoneCompletionInfo = memo(MilestoneCompletionInfoComponent);
