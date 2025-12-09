"use client";
import type { IProjectImpact } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { MilestonesList } from "@/components/Milestone/MilestonesList";
import { Button } from "@/components/Utilities/Button";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useOwnerStore, useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import type { UnifiedMilestone } from "@/types/roadmap";
import type { ProjectResponse } from "@/types/v2/project";
import { MESSAGES } from "@/utilities/messages";
import { RoadmapListLoading } from "../Loading/Roadmap";

interface ProjectRoadmapProps {
  project?: ProjectResponse;
}

// Pure utility function for sorting
const getSortTimestamp = (item: UnifiedMilestone): number => {
  if (item.endsAt) return item.endsAt;
  if (item.completed && typeof item.completed === "object" && "createdAt" in item.completed) {
    return new Date(item.completed.createdAt).getTime();
  }
  return new Date(item.createdAt).getTime();
};

export const ProjectRoadmap = ({ project: propProject }: ProjectRoadmapProps) => {
  const { projectId } = useParams();
  const searchParams = useSearchParams();

  const zustandProject = useProjectStore((state) => state.project);

  const project = propProject || zustandProject;

  // Use API endpoint for all updates, milestones, and grant milestones
  // API now returns grant title and community info directly
  const { milestones: apiMilestones = [], isLoading } = useProjectUpdates(projectId as string);

  const { setIsProgressModalOpen, setProgressModalScreen } = useProgressModalStore();

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

  // Derive active filters directly from URL params - no state synchronization needed
  const activeFilters = useMemo(() => {
    const filterParam = searchParams.get("filter");
    if (!filterParam) return ["all"];
    return filterParam.split(",");
  }, [searchParams]);

  // Combine V2 milestones with impacts from project data (impacts not yet in V2 endpoint)
  const combinedUpdatesAndMilestones = useMemo(() => {
    const impacts: IProjectImpact[] = project?.impacts || [];

    const impactItems = impacts.map((impact): UnifiedMilestone => {
      const createdAt = impact.createdAt || new Date().toISOString();

      return {
        uid: impact.uid,
        chainID: impact.chainID,
        refUID: impact.refUID || project?.uid || "",
        title: "Project Impact",
        description: "",
        type: "impact",
        completed: false,
        createdAt,
        projectImpact: impact,
        source: {
          type: "impact",
        },
      };
    });

    const allItems = [...apiMilestones, ...impactItems];

    const allSortedItems = [...allItems].sort((a, b) => {
      const timestampA = getSortTimestamp(a);
      const timestampB = getSortTimestamp(b);

      return timestampB - timestampA;
    });

    return allSortedItems;
  }, [project?.impacts, project?.uid, apiMilestones]);

  // Filter items based on active filters
  const filteredItems = useMemo(() => {
    // If user selected "all", return everything
    if (activeFilters.includes("all")) {
      return combinedUpdatesAndMilestones;
    }

    // Core filtering function
    return combinedUpdatesAndMilestones.filter((item) => {
      // We'll thoroughly examine each item and check against all selected filters

      // ===== PENDING MILESTONES =====
      if (activeFilters.includes("pending")) {
        // Using a direct approach - looking at the 'completed' flag directly
        if (item.completed === false) {
          // For pending, check the underlying schema matches a milestone type
          const isMilestoneType =
            item.type === "milestone" || item.type === "grant" || item.type === "project";

          if (isMilestoneType) {
            return true;
          }
        }
      }

      // ===== COMPLETED MILESTONES =====
      if (activeFilters.includes("completed")) {
        // Both boolean true and object {"createdAt": ...} should be treated as completed
        const isItemCompleted =
          item.completed === true || (item.completed && typeof item.completed === "object");

        // Check if it's a milestone or grant type
        const isMilestoneType =
          item.type === "milestone" || item.type === "grant" || item.type === "project";

        if (isItemCompleted && isMilestoneType) {
          return true;
        }
      }

      // ===== IMPACT FILTER =====
      if (activeFilters.includes("impacts")) {
        // Simply check the type - we've improved the type detection
        if (item.type === "impact") {
          return true;
        }
      }

      // ===== ACTIVITIES FILTER =====
      if (activeFilters.includes("activities")) {
        // Activities should only be items explicitly marked as activities
        if (item.type === "activity") {
          return true;
        }
      }

      // ===== GRANT UPDATES FILTER =====
      if (activeFilters.includes("updates")) {
        // Simply check the type - we've improved the type detection
        if (item.type === "grant_update") {
          return true;
        }
      }

      // If none of the filters matched, don't include this item
      return false;
    });
  }, [combinedUpdatesAndMilestones, activeFilters]);

  // If no project data is available, show loading
  if (!project) {
    return <RoadmapListLoading />;
  }

  return (
    <div className="flex flex-col w-full h-full items-center justify-start">
      <div className="flex flex-col gap-2 pt-4 pb-11 items-center justify-start w-full max-w-full max-lg:py-6">
        {/* Combined List Section */}
        <div className="py-6 w-full">
          {isLoading ? (
            <RoadmapListLoading />
          ) : filteredItems.length > 0 ? (
            <MilestonesList
              milestones={filteredItems}
              showAllTypes={true}
              totalItems={filteredItems.length}
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
                      Go ahead and create your first project activity or milestone
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
