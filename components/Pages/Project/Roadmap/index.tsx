"use client";
import { ObjectiveFilter } from "@/components/Pages/Project/Objective/Filter";
import { ObjectivesSub } from "@/components/Pages/Project/Objective/ObjectivesSub";
import { RoadmapListLoading } from "../Loading/Roadmap";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import dynamic from "next/dynamic";

const ObjectiveList = dynamic(
  () =>
    import("@/components/Pages/Project/Objective/List").then(
      (mod) => mod.ObjectiveList
    ),
  {
    loading: () => <RoadmapListLoading />,
  }
);

interface ProjectRoadmapProps {
  project: IProjectResponse;
}

export const ProjectRoadmap = ({ project }: ProjectRoadmapProps) => {
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
          <ObjectiveFilter />
        </div>
        <div className="py-6 w-full">
          <ObjectiveList />
        </div>
      </div>
    </div>
  );
};
