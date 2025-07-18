"use client";
import { ObjectivesSub } from "@/components/Pages/Project/Objective/ObjectivesSub";
import { RoadmapListLoading } from "../loading/Roadmap";
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
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { useQuery } from "@tanstack/react-query";
import { useProgressModalStore } from "@/store/modals/progress";
import { Button } from "@/components/Utilities/Button";
import { useProjectStore } from "@/src/features/projects/lib/store";
import { useOwnerStore } from "@/store/owner";
import { MESSAGES } from "@/config/messages";
import { UnifiedMilestone } from "@/types/roadmap";

interface ProjectRoadmapProps {
  project?: IProjectResponse;
}

export const ProjectRoadmap = ({
  project: propProject,
}: ProjectRoadmapProps) => {
  const { projectId } = useParams();
  const searchParams = useSearchParams();

  const zustandProject = useProjectStore((state) => state.project);

  const project = propProject || zustandProject;

  const { milestones = [], isLoading } = useAllMilestones(projectId as string);

  const { setIsProgressModalOpen, setProgressModalScreen } =
    useProgressModalStore();

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

  // Parse filters from URL
  const getActiveFilters = () => {
    const filterParam = searchParams.get("filter");
    if (!filterParam) return ["all"];
    return filterParam.split(",");
  };

  const [activeFilters, setActiveFilters] = useState<string[]>(
    getActiveFilters()
  );

  // Sync with URL params when they change
  useEffect(() => {
    setActiveFilters(getActiveFilters());
  }, [searchParams]);

  // Helper function to normalize any timestamp format to milliseconds
  const normalizeToMilliseconds = (timestamp: unknown): number | null => {
    if (timestamp === null || timestamp === undefined) {
      return null;
    }

    // If it's already a number
    if (typeof timestamp === "number") {
      // Detect if it's seconds (Unix timestamps in seconds typically have 10 digits or less)
      // While millisecond timestamps have 13 digits
      const isSeconds = timestamp < 10000000000; // If less than 11 digits, assume seconds
      return isSeconds ? timestamp * 1000 : timestamp;
    }

    // If it's a string date or anything else, try to parse it
    try {
      // Only parse data types that Date constructor can handle
      if (
        typeof timestamp === "string" ||
        timestamp instanceof Date ||
        (typeof timestamp === "object" && timestamp !== null)
      ) {
        const parsed = new Date(timestamp as string | number | Date).getTime();
        return !isNaN(parsed) ? parsed : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Create a function to get sortable timestamp for any item
  const getSortTimestamp = (item: UnifiedMilestone): number => {
    try {
      // Check dates in priority order - end date is most important for milestones
      const dates = [
        normalizeToMilliseconds(item?.endsAt),
        normalizeToMilliseconds(item?.startsAt),
        item?.completed &&
        typeof item.completed === "object" &&
        "createdAt" in item.completed
          ? normalizeToMilliseconds(item.completed.createdAt)
          : null,
        normalizeToMilliseconds(item?.createdAt),
      ];

      return dates.find((date) => date !== null) || Date.now();
    } catch (error) {
      return Date.now();
    }
  };

  const combinedUpdatesAndMilestones = useMemo(() => {
    const updates: IProjectUpdate[] = project?.updates || [];
    const grantUpdates: IGrantUpdate[] = [];
    const grantMilestones: IMilestoneResponse[] = [];
    const impacts: IProjectImpact[] = project?.impacts || [];

    if (project?.grants) {
      project.grants.forEach((grant) => {
        if (grant.updates) grantUpdates.push(...grant.updates);
        if (grant.milestones) grantMilestones.push(...grant.milestones);
      });
    }

    const allUpdates = [...updates, ...grantUpdates, ...impacts];

    const updateItems = allUpdates.map((update: any): UnifiedMilestone => {
      const createdAt = update.createdAt || new Date().toISOString();

      let startDate: number | undefined;
      if (update.data?.startDate) {
        const parsedDate = new Date(update.data.startDate).getTime();
        startDate = !isNaN(parsedDate) ? parsedDate : undefined;
      }

      let endDate: number | undefined;
      if (update.data?.endDate) {
        const parsedDate = new Date(update.data.endDate).getTime();
        endDate = !isNaN(parsedDate) ? parsedDate : undefined;
      }

      let type = "update";

      if (
        update.data?.type === "impact" ||
        update.data?.type === "project-impact" ||
        (update.data?.title &&
          update.data.title.toLowerCase().includes("impact")) ||
        (update.__typename && update.__typename === "Impact")
      ) {
        type = "impact";
      } else if (
        update.source === "grant" ||
        (update.data?.title &&
          update.data.title.toLowerCase().includes("grant")) ||
        (update.refUID && update.refUID !== project?.uid) // If referencing something other than the project, likely a grant
      ) {
        type = "grant_update";
      } else if (update.data?.type === "project-milestone") {
        type = "milestone";
      } else {
        type = "activity";
      }

      return {
        uid: update.uid,
        chainID: update.chainID,
        refUID: update.refUID || project?.uid || "",
        title: update.data?.title || "Update",
        description: update.data?.text || "",
        type: type as any,
        completed: false,
        createdAt,
        startsAt: startDate,
        endsAt: endDate,
        updateData: update,
        source: {
          type: update.data?.type === "impact" ? "impact" : "update",
          update,
        },
      };
    });

    const milestonesArray = Array.isArray(milestones) ? milestones : [];

    const allItems = [...milestonesArray, ...updateItems];

    const allSortedItems = [...allItems].sort((a, b) => {
      const timestampA = getSortTimestamp(a);
      const timestampB = getSortTimestamp(b);

      return timestampB - timestampA;
    });

    return allSortedItems;
  }, [
    project?.grants,
    project?.updates,
    project?.impacts,
    project?.uid,
    milestones,
  ]);

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
            item.type === "milestone" ||
            item.type === "grant" ||
            item.type === "project";

          if (isMilestoneType) {
            return true;
          }
        }
      }

      // ===== COMPLETED MILESTONES =====
      if (activeFilters.includes("completed")) {
        // Both boolean true and object {"createdAt": ...} should be treated as completed
        const isItemCompleted =
          item.completed === true ||
          (item.completed && typeof item.completed === "object");

        // Check if it's a milestone or grant type
        const isMilestoneType =
          item.type === "milestone" ||
          item.type === "grant" ||
          item.type === "project";

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
