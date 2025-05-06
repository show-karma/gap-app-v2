"use client";

import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { ObjectiveCard } from "./Card";
import { SetAnObjective } from "./SetAnObjective";
import { useQuery } from "@tanstack/react-query";
import {
  getProjectObjectives,
  StatusOptions,
} from "@/utilities/gapIndexerApi/getProjectObjectives";
import { useParams } from "next/navigation";
import { useOwnerStore, useProjectStore } from "@/store";
import { useQueryState } from "nuqs";
import { RoadmapListLoading } from "../Loading/Roadmap";

export const ObjectiveList = () => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;
  const uidOrSlug = useParams().projectId as string;

  const [status] = useQueryState<StatusOptions>("status", {
    defaultValue: "all",
    serialize: (value) => value,
    parse: (value) =>
      value ? (value as StatusOptions) : ("all" as StatusOptions),
  });

  const { data: objectives, isLoading } = useQuery<IProjectMilestoneResponse[]>(
    {
      queryKey: ["projectMilestones"],
      queryFn: () => getProjectObjectives(uidOrSlug),
    }
  );

  const filterByStatusObjectives = objectives?.filter((objective) => {
    if (status === "completed") return objective.completed;
    if (status === "pending") return !objective.completed;
    return true;
  });

  const orderedObjectives = filterByStatusObjectives?.sort((a, b) => {
    const aDate = new Date(a.createdAt);
    const bDate = new Date(b.createdAt);
    return bDate.getTime() - aDate.getTime();
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {isAuthorized ? (
        <SetAnObjective
          hasObjectives={
            (orderedObjectives && orderedObjectives?.length > 0) || false
          }
        />
      ) : null}
      {isLoading ? (
        <RoadmapListLoading />
      ) : orderedObjectives && orderedObjectives?.length > 0 ? (
        <div className="flex w-full flex-col gap-6 px-6 py-10 bg-[#F9FAFB] dark:bg-zinc-900 rounded-xl max-lg:px-2 max-lg:py-4">
          {orderedObjectives?.map((item, index) => (
            <ObjectiveCard
              isAuthorized={isAuthorized}
              key={index}
              objective={item}
            />
          ))}
        </div>
      ) : !isAuthorized ? (
        <div className="flex flex-col gap-2 justify-center items-start border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-8 w-full">
          <p className="text-zinc-900 font-bold text-center text-lg w-full dark:text-zinc-300">
            No milestones found!
          </p>
          <p className="text-zinc-900 dark:text-zinc-300 w-full text-center">
            {
              "The project owner is working on setting milestones. Check back in a few days :)"
            }
          </p>
        </div>
      ) : null}
    </div>
  );
};
