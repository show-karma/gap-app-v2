"use client";

import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { ObjectiveCard } from "./Card";
import { SetAnObjective } from "./SetAnObjective";
import { useQuery } from "@tanstack/react-query";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { useParams } from "next/navigation";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useOwnerStore, useProjectStore } from "@/store";

export const ObjectiveList = () => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isAuthorized = isOwner || isProjectOwner;
  const uidOrSlug = useParams().projectId as string;

  const {
    data: objectives,
    isLoading,
    refetch,
  } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones"],
    queryFn: () => getProjectObjectives(uidOrSlug),
  });

  const orderedObjectives = objectives?.sort((a, b) => {
    const aDate = new Date(a.createdAt);
    const bDate = new Date(b.createdAt);
    return bDate.getTime() - aDate.getTime();
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {isAuthorized ? <SetAnObjective /> : null}
      {isLoading ? (
        <DefaultLoading />
      ) : orderedObjectives && orderedObjectives?.length > 0 ? (
        orderedObjectives?.map((item, index) => (
          <ObjectiveCard
            isAuthorized={isAuthorized}
            key={index}
            objective={item}
          />
        ))
      ) : (
        <div className="flex flex-col gap-2 justify-center items-start">
          <p className="text-zinc-900 dark:text-zinc-300">
            No objectives found
          </p>
          <p className="text-zinc-900 dark:text-zinc-300">
            You can set an objective by clicking the button above
          </p>
        </div>
      )}
    </div>
  );
};
