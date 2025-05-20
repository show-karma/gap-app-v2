"use client";
import { ObjectivesSub } from "@/components/Pages/Project/Objective/ObjectivesSub";
import { RoadmapListLoading } from "../Loading/Roadmap";
import {
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useAllMilestones } from "@/hooks/useAllMilestones";
import { MilestonesList } from "@/components/Milestone/MilestonesList";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { useQuery } from "@tanstack/react-query";
import { useProgressModalStore } from "@/store/modals/progress";
import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { MESSAGES } from "@/utilities/messages";
import { UnifiedMilestone } from "@/types/roadmap";

interface ProjectRoadmapProps {
  project: IProjectResponse;
}

export const ProjectRoadmap = ({ project }: ProjectRoadmapProps) => {
  const { projectId } = useParams();
  const {
    pendingMilestones,
    milestones = [],
    isLoading,
    refetch,
  } = useAllMilestones(projectId as string);
  const [combinedUpdatesAndMilestones, setCombinedUpdatesAndMilestones] =
    useState<UnifiedMilestone[]>([]);
  const { setIsProgressModalOpen, setProgressModalScreen } =
    useProgressModalStore();

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

  // Fetch project milestones directly from API
  const { data: projectMilestones } = useQuery<IProjectMilestoneResponse[]>({
    queryKey: ["projectMilestones", project?.uid],
    queryFn: () => getProjectObjectives(project?.uid || ""),
    enabled: !!project?.uid,
  });

  useEffect(() => {
    const updates: IProjectUpdate[] = project?.updates || [];
    const grantUpdates: IGrantUpdate[] = [];
    const grantMilestones: IMilestoneResponse[] = [];
    const impacts: IProjectImpact[] = project?.impacts || [];

    project?.grants.forEach((grant) => {
      grantUpdates.push(...grant.updates);
      grantMilestones.push(...grant.milestones);
    });

    // For milestone data, use the unified list from useAllMilestones
    // Convert other updates to a format compatible with UnifiedMilestone

    const updateMilestones = [...updates, ...grantUpdates, ...impacts].map(
      (update: any) => {
        // Create a simplified UnifiedMilestone-compatible object for updates
        const createdAt = new Date(update.createdAt).getTime();
        const startDate = update.data?.startDate
          ? new Date(update.data.startDate).getTime()
          : undefined;
        const endDate = update.data?.endDate
          ? new Date(update.data.endDate).getTime()
          : undefined;

        // Create a properly typed update milestone
        const updateMilestone: UnifiedMilestone = {
          uid: update.uid,
          chainID: update.chainID,
          refUID: update.refUID || project.uid,
          title: update.data?.title || "Update",
          description: update.data?.text || "",
          type: "update",
          completed: false,
          createdAt: update.createdAt,
          startsAt: startDate || createdAt,
          endsAt: endDate,
          updateData: update,
          source: {
            type: "update",
            update: update,
          },
        };

        return updateMilestone;
      }
    );

    // Combine and sort all items by date
    const allItems = [...milestones, ...updateMilestones].sort((a, b) => {
      // Get dates for sorting, preferring end date, then start date, then created date
      const dateA = a.endsAt || a.startsAt || new Date(a.createdAt).getTime();
      const dateB = b.endsAt || b.startsAt || new Date(b.createdAt).getTime();

      return dateB - dateA; // Sort by newest first
    });

    setCombinedUpdatesAndMilestones(allItems);
  }, [
    project?.grants,
    project?.updates,
    project?.impacts,
    projectMilestones,
    milestones,
  ]);

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

        {/* Combined List Section */}
        <div className="py-6 w-full">
          {isLoading ? (
            <RoadmapListLoading />
          ) : combinedUpdatesAndMilestones.length > 0 ? (
            <MilestonesList
              milestones={combinedUpdatesAndMilestones}
              showAllTypes={true}
              totalItems={combinedUpdatesAndMilestones.length}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {isAuthorized ? (
                <div className="flex flex-1 flex-col gap-6">
                  <div
                    className="flex h-60 border-spacing-4 flex-col items-center justify-center gap-5 rounded border border-blue-600 dark:bg-zinc-900 bg-[#EEF4FF] px-8"
                    style={{
                      border: "dashed 2px #155EEF",
                    }}
                  >
                    <p className="w-full text-center text-lg break-words h-max font-semibold text-black dark:text-zinc-200">
                      Go ahead and create your first project activity or
                      milestone
                    </p>
                    <Button
                      type="button"
                      className="w-max bg-brand-blue text-white px-4 py-2 rounded-lg"
                      onClick={() => {
                        setProgressModalScreen("project_update");
                        setIsProgressModalOpen(true);
                      }}
                    >
                      Create new activity
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex w-full items-center justify-center rounded border border-gray-200 px-6 py-10">
                  <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
                    <img
                      src="/images/comments.png"
                      alt=""
                      className="h-[185px] w-[438px] object-cover"
                    />
                    <div className="flex w-full flex-col items-center justify-center gap-3">
                      <p className="text-center text-lg font-semibold text-black dark:text-zinc-100 ">
                        Welcome to the Project Roadmap!
                      </p>
                      <p className="text-center text-base font-normal text-black dark:text-zinc-100 ">
                        {MESSAGES.PROJECT.EMPTY.UPDATES.NOT_CREATED}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
