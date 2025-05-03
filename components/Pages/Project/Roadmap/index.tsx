"use client";
import { ObjectivesSub } from "@/components/Pages/Project/Objective/ObjectivesSub";
import { RoadmapListLoading } from "../Loading/Roadmap";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useAllMilestones } from "@/hooks/useAllMilestones";
import { MilestonesList } from "@/components/Milestone/MilestonesList";
import { useParams } from "next/navigation";

interface ProjectRoadmapProps {
  project: IProjectResponse;
}

export const ProjectRoadmap = ({ project }: ProjectRoadmapProps) => {
  const { projectId } = useParams();
  const { pendingMilestones, isLoading } = useAllMilestones(
    projectId as string
  );

  return (
    <div className="flex flex-col w-full h-full items-center justify-start">
      <div className="flex flex-col gap-2 py-11 items-center justify-start w-full max-w-6xl max-lg:py-6">
        <div className="py-5 w-full items-center flex flex-row justify-between gap-4 max-lg:flex-col max-lg:items-start max-lg:py-0">
          <div className="flex flex-col gap-1 items-start justify-start">
            <h3 className="text-2xl font-bold text-black dark:text-zinc-200">
              {project.details?.data?.title} Roadmap
            </h3>
            <ObjectivesSub />
          </div>
        </div>
        <div className="py-6 w-full">
          {isLoading ? (
            <RoadmapListLoading />
          ) : (
            <MilestonesList milestones={pendingMilestones} />
          )}
        </div>
      </div>
    </div>
  );
};
