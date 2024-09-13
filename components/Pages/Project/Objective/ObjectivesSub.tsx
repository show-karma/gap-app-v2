"use client";
import { formatDate } from "@/utilities/formatDate";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import pluralize from "pluralize";

export const ObjectivesSub = () => {
  const { projectId } = useParams();
  const { data: objectives } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(projectId as string),
  });
  const completedObjectives =
    objectives?.filter((objective) => objective.completed)?.length || 0;

  const totalObjectives = objectives?.length || 0;
  const lastUpdated = objectives
    ? objectives?.sort((a, b) => {
        const getDate = (item: IProjectMilestoneResponse) => {
          if (item.completed) {
            return new Date(item.completed.createdAt).getTime();
          }
          return new Date(item.createdAt).getTime();
        };
        return getDate(b) - getDate(a);
      })[0]?.createdAt
    : null;

  if (totalObjectives === 0) return null;

  return (
    <div className="flex flex-row gap-2 items-center justify-start max-lg:flex-col max-lg:items-start max-lg:justify-center max-lg:gap-1">
      <p className="text-base font-normal text-[#475467] dark:text-gray-400">
        {`${totalObjectives} ${pluralize(
          "Objective",
          totalObjectives
        )}, ${completedObjectives} ${pluralize(
          "Completed",
          completedObjectives
        )}`}
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
