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
import { useEffect, useMemo } from "react";
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

      // Return the first valid date in our priority order, or fallback to now
      return dates.find((date) => date !== null) || Date.now();
    } catch (error) {
      return Date.now();
    }
  };

  // Memoize combined updates and milestones to prevent infinite loops
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

    // For milestone data, we'll use milestones directly from the useAllMilestones hook
    // Convert updates to a format compatible with UnifiedMilestone
    const allUpdates = [...updates, ...grantUpdates, ...impacts];

    // Create normalized update objects
    const updateItems = allUpdates.map((update: any): UnifiedMilestone => {
      // Ensure we have valid dates by providing defaults
      const createdAt = update.createdAt || new Date().toISOString();

      // Parse dates carefully to avoid NaN or invalid dates
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

      return {
        uid: update.uid,
        chainID: update.chainID,
        refUID: update.refUID || project.uid,
        title: update.data?.title || "Update",
        description: update.data?.text || "",
        type: "update" as const,
        completed: false,
        createdAt,
        startsAt: startDate,
        endsAt: endDate,
        updateData: update,
        source: {
          type: "update",
          update,
        },
      };
    });

    // Ensure milestones is an array before attempting to spread it
    const milestonesArray = Array.isArray(milestones) ? milestones : [];

    // Combine all items
    const allItems = [...milestonesArray, ...updateItems];

    // Sort by timestamp, newest first
    const allSortedItems = [...allItems].sort((a, b) => {
      const timestampA = getSortTimestamp(a);
      const timestampB = getSortTimestamp(b);

      // Log any sorting anomalies
      if (
        process.env.NODE_ENV === "development" &&
        (isNaN(timestampA) || isNaN(timestampB))
      ) {
        console.warn("Invalid timestamp for sorting:", {
          itemA: { title: a.title, timestamp: timestampA },
          itemB: { title: b.title, timestamp: timestampB },
        });
      }

      return timestampB - timestampA;
    });
    console.log(
      allSortedItems
        .map((item) => ({
          title: item.title,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          createdAt: item.createdAt,
          sortTimestamp: getSortTimestamp(item),
          sortDate: new Date(getSortTimestamp(item)).toISOString(),
        }))
        .slice(0, 10)
    );
    return allSortedItems;
  }, [
    project?.grants,
    project?.updates,
    project?.impacts,
    project?.uid,
    milestones,
    projectMilestones,
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
