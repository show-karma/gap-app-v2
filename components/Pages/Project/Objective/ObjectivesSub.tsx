"use client";
import { formatDate } from "@/utilities/formatDate";
import { useAllMilestones } from "@/hooks/useAllMilestones";
import { useParams } from "next/navigation";
import pluralize from "pluralize";

export const ObjectivesSub = () => {
  const { projectId } = useParams();
  const { milestones } = useAllMilestones(projectId as string);

  const completedMilestones =
    milestones?.filter((milestone) => milestone.completed)?.length || 0;
  const totalMilestones = milestones?.length || 0;

  const lastUpdated = milestones
    ? milestones?.sort((a, b) => {
        const getDate = (item: any) => {
          if (item.completed) {
            return new Date(
              item.type === "project"
                ? item.source.projectMilestone?.completed?.createdAt ||
                  item.createdAt
                : item.source.grantMilestone?.milestone.completed?.createdAt ||
                  item.createdAt
            ).getTime();
          }
          return new Date(item.createdAt).getTime();
        };
        return getDate(b) - getDate(a);
      })[0]?.createdAt
    : null;

  if (totalMilestones === 0) return null;

  return (
    <div className="flex flex-row gap-2 items-center justify-start max-lg:flex-col max-lg:items-start max-lg:justify-center max-lg:gap-1">
      <p className="text-base font-normal text-[#475467] dark:text-gray-400">
        {`${totalMilestones} ${pluralize(
          "Milestone",
          totalMilestones
        )}, ${completedMilestones} Completed`}
      </p>
      {lastUpdated ? (
        <>
          <div className="w-[4px] h-[4px] rounded-full bg-gray-500 max-lg:hidden" />
          <p className="text-base font-normal text-[#475467] dark:text-gray-400">
            {`Last Updated on ${formatDate(lastUpdated)}`}
          </p>
        </>
      ) : null}
    </div>
  );
};
