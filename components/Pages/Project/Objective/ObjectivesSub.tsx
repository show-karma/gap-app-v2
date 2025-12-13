"use client";
import { useParams } from "next/navigation";
import pluralize from "pluralize";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";

export const ObjectivesSub = () => {
  const { projectId } = useParams();
  const { milestones } = useProjectUpdates(projectId as string);

  // Filter to only include actual milestones (project milestones and grant milestones)
  // Excludes activity (project updates), grant_update, impact, and other non-milestone types
  const actualMilestones = milestones?.filter(
    (item) => item.type === "milestone" || item.type === "grant"
  );

  const completedMilestones =
    actualMilestones?.filter((milestone) => milestone.completed)?.length || 0;
  const totalMilestones = actualMilestones?.length || 0;

  if (totalMilestones === 0) return null;

  return (
    <div className="flex flex-row gap-2 items-center justify-start max-lg:flex-col max-lg:items-start max-lg:justify-center max-lg:gap-1">
      <p className="text-base font-normal text-[#475467] dark:text-gray-400">
        {`${totalMilestones} ${pluralize(
          "Milestone",
          totalMilestones
        )}, ${completedMilestones} Completed`}
      </p>
    </div>
  );
};
