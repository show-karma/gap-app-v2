"use client";
import { formatDate } from "@/lib/format/date";
import { useAllMilestones } from "@/features/milestones/hooks/use-all-milestones";
import { useParams } from "next/navigation";
import pluralize from "pluralize";

export const ObjectivesSub = () => {
  const { projectId } = useParams();
  const { milestones } = useAllMilestones(projectId as string);

  const completedMilestones =
    milestones?.filter((milestone) => milestone.completed)?.length || 0;
  const totalMilestones = milestones?.length || 0;

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
