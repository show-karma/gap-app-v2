"use client";

import { MilestoneCard } from "./MilestoneCard";
import { useQueryState } from "nuqs";
import { StatusOptions } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { useOwnerStore, useProjectStore } from "@/store";
import { SetAnObjective } from "@/components/Pages/Project/Objective/SetAnObjective";
import { UnifiedMilestone } from "@/types/roadmap";
import { UpdateBlock } from "@/components/Pages/Project/Updates/UpdateBlock";
import {
  IGrantUpdate,
  IProjectImpact,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

interface MilestonesListProps {
  milestones: UnifiedMilestone[];
  showAllTypes?: boolean;
  totalItems?: number;
}

export const MilestonesList = ({
  milestones,
  showAllTypes = false,
  totalItems,
}: MilestonesListProps) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

  const [status] = useQueryState<StatusOptions>("status", {
    defaultValue: "all",
    serialize: (value) => value,
    parse: (value) =>
      value ? (value as StatusOptions) : ("all" as StatusOptions),
  });

  // Merge duplicate milestones based on content
  const mergeDuplicateMilestones = (
    milestones: UnifiedMilestone[]
  ): UnifiedMilestone[] => {
    const mergedMap = new Map<string, UnifiedMilestone>();

    milestones.forEach((milestone) => {
      // Skip updates, impacts, activities from merging as they're unique
      if (
        milestone.type === "update" ||
        milestone.type === "impact" ||
        milestone.type === "activity" ||
        milestone.type === "grant_update"
      ) {
        mergedMap.set(milestone.uid, milestone);
        return;
      }

      // Skip project milestones from merging (they're unique by nature)
      if (milestone.type === "project" || milestone.type === "milestone") {
        mergedMap.set(milestone.uid, {
          ...milestone,
          uid: milestone.uid || "",
          chainID: milestone.source.projectMilestone?.chainID || 0,
          refUID: milestone.source.projectMilestone?.uid || "",
        });
        return;
      }

      // Create a unique key based on title, description, and dates
      const startDate =
        milestone.source.grantMilestone?.milestone.data.startsAt;
      const endDate = milestone.source.grantMilestone?.milestone.data.endsAt;

      const key = `${milestone.title}|${milestone.description || ""}|${
        startDate || ""
      }|${endDate || ""}`;

      if (mergedMap.has(key)) {
        // Milestone exists, add this grant to the merged list
        const existingMilestone = mergedMap.get(key)!;

        if (!existingMilestone.mergedGrants) {
          // Initialize mergedGrants if this is the first duplicate
          const firstGrant = existingMilestone.source.grantMilestone;
          existingMilestone.mergedGrants = [
            {
              grantUID: firstGrant?.grant.uid || "",
              grantTitle: firstGrant?.grant.details?.data.title,
              communityName: firstGrant?.grant.community?.details?.data.name,
              communityImage:
                firstGrant?.grant.community?.details?.data.imageURL,
              chainID: firstGrant?.grant.chainID || 0,
              milestoneUID: firstGrant?.milestone.uid || "",
              programId: firstGrant?.grant.details?.data.programId,
            },
          ];
        }

        // Add the current grant to the merged list
        existingMilestone.mergedGrants.push({
          grantUID: milestone.source.grantMilestone?.grant.uid || "",
          grantTitle:
            milestone.source.grantMilestone?.grant.details?.data.title,
          communityName:
            milestone.source.grantMilestone?.grant.community?.details?.data
              .name,
          communityImage:
            milestone.source.grantMilestone?.grant.community?.details?.data
              .imageURL,
          chainID: milestone.source.grantMilestone?.grant.chainID || 0,
          milestoneUID: milestone.source.grantMilestone?.milestone.uid || "",
          programId:
            milestone.source.grantMilestone?.grant.details?.data.programId,
        });

        // Sort the merged grants alphabetically
        existingMilestone.mergedGrants.sort((a, b) => {
          const titleA = a.grantTitle || "Untitled Grant";
          const titleB = b.grantTitle || "Untitled Grant";
          return titleA.localeCompare(titleB);
        });

        mergedMap.set(key, existingMilestone);
      } else {
        // Add as new milestone with required properties
        mergedMap.set(key, {
          ...milestone,
          uid: milestone.uid || "",
          chainID: milestone.source.grantMilestone?.grant.chainID || 0,
          refUID: milestone.source.grantMilestone?.grant.uid || "",
        });
      }
    });

    return Array.from(mergedMap.values());
  };

  // Type guard function to check if an item is an update
  const isUpdateType = (item: UnifiedMilestone): boolean => {
    // Consider all non-milestone types as "updates" for rendering purposes
    return (
      item.type === "update" ||
      item.type === "impact" ||
      item.type === "activity" ||
      item.type === "grant_update"
    );
  };

  // Type guard function to check if an update data exists
  const hasUpdateData = (
    item: UnifiedMilestone
  ): item is UnifiedMilestone & {
    updateData: IProjectUpdate | IGrantUpdate | IProjectImpact;
  } => {
    return isUpdateType(item) && !!item.updateData;
  };

  // Filter milestones based on status
  let filteredMilestones = milestones.filter((milestone) => {
    if (!showAllTypes && milestone.type === "update") return false;
    if (status === "completed") return milestone.completed;
    if (status === "pending") return !milestone.completed;
    return true;
  });

  // Merge duplicates for regular milestones
  const unifiedMilestones = mergeDuplicateMilestones(filteredMilestones);

  return (
    <div className="flex flex-col gap-6 w-full">
      {isAuthorized ? (
        <SetAnObjective
          hasObjectives={
            (unifiedMilestones && unifiedMilestones.length > 0) || false
          }
        />
      ) : null}

      {unifiedMilestones && unifiedMilestones.length > 0 ? (
        <div className="flex w-full flex-col gap-6 dark:bg-zinc-900 rounded-xl max-lg:px-2 max-lg:py-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-black dark:text-zinc-200">
              {`Activities ${totalItems ? `(${totalItems})` : ""}`}
            </h3>
          </div>

          {unifiedMilestones.map((item, index) =>
            hasUpdateData(item) ? (
              <UpdateBlock
                key={`update-${item.uid}-${index}`}
                update={item.updateData}
                index={index}
              />
            ) : (
              <MilestoneCard
                key={`milestone-${item.uid}-${index}`}
                milestone={item}
                isAuthorized={isAuthorized}
              />
            )
          )}
        </div>
      ) : !isAuthorized ? (
        <div className="flex flex-col gap-2 justify-center items-start border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-8 w-full">
          <p className="text-zinc-900 font-bold text-center text-lg w-full dark:text-zinc-300">
            {showAllTypes ? "No content found!" : "No milestones found!"}
          </p>
          <p className="text-zinc-900 dark:text-zinc-300 w-full text-center">
            {`The project owner is working on setting ${
              showAllTypes ? "milestones and activities" : "milestones"
            }. Check back in a few days :)`}
          </p>
        </div>
      ) : null}
    </div>
  );
};
