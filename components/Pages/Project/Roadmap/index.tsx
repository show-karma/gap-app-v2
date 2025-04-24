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
  const projectId = useParams().projectId as string;
  const { milestones, isLoading } = useAllMilestones(projectId);

  // Helper function to get milestones sorted by end date (ascending)
  const getMilestonesSortedByEndDate = () => {
    if (!milestones) return [];

    return [...milestones].sort((a, b) => {
      // Sort logic for milestones with and without end dates
      // 1. If both have end dates, compare them
      if (a.endsAt && b.endsAt) {
        return a.endsAt - b.endsAt;
      }

      // 2. If only one has an end date, prioritize it (those with end dates come first)
      if (a.endsAt && !b.endsAt) return -1;
      if (!a.endsAt && b.endsAt) return 1;

      // 3. If neither has an end date, fall back to creation date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  // Filter to only show pending milestones
  const pendingMilestones = getMilestonesSortedByEndDate().filter(
    (milestone) => !milestone.completed
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
