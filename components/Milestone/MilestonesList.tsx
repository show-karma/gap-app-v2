"use client";

import { UnifiedMilestone } from "@/utilities/gapIndexerApi/getAllMilestones";
import { MilestoneCard } from "./MilestoneCard";
import { useQueryState } from "nuqs";
import { StatusOptions } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { useOwnerStore, useProjectStore } from "@/store";
import { SetAnObjective } from "@/components/Pages/Project/Objective/SetAnObjective";

interface MilestonesListProps {
  milestones: UnifiedMilestone[];
}

// Extended milestone type that includes multiple grant references
interface MergedMilestone extends UnifiedMilestone {
  id: string;
  chainID: number;
  refUID: string;
  mergedGrants?: Array<{
    grantId: string;
    grantTitle?: string;
    communityName?: string;
    communityImage?: string;
  }>;
}

export const MilestonesList = ({ milestones }: MilestonesListProps) => {
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
  ): MergedMilestone[] => {
    const mergedMap = new Map<string, MergedMilestone>();

    milestones.forEach((milestone) => {
      // Create a unique key based on title, description, and dates
      const startDate =
        milestone.source.grantMilestone?.milestone.data.startsAt;
      const endDate = milestone.source.grantMilestone?.milestone.data.endsAt;

      // Skip project milestones from merging (they're unique by nature)
      if (milestone.type === "project") {
        mergedMap.set(`project-${milestone.id}`, {
          ...milestone,
          id: milestone.id || "",
          chainID: milestone.source.projectMilestone?.chainID || 0,
          refUID: milestone.source.projectMilestone?.uid || "",
        });
        return;
      }

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
              grantId: firstGrant?.grant.uid || "",
              grantTitle: firstGrant?.grant.details?.data.title,
              communityName: firstGrant?.grant.community?.details?.data.name,
              communityImage:
                firstGrant?.grant.community?.details?.data.imageURL,
            },
          ];
        }

        // Add the current grant to the merged list
        existingMilestone.mergedGrants.push({
          grantId: milestone.source.grantMilestone?.grant.uid || "",
          grantTitle:
            milestone.source.grantMilestone?.grant.details?.data.title,
          communityName:
            milestone.source.grantMilestone?.grant.community?.details?.data
              .name,
          communityImage:
            milestone.source.grantMilestone?.grant.community?.details?.data
              .imageURL,
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
          id: milestone.id || "",
          chainID: milestone.source.grantMilestone?.grant.chainID || 0,
          refUID: milestone.source.grantMilestone?.grant.uid || "",
        });
      }
    });

    return Array.from(mergedMap.values());
  };

  const filteredMilestones = milestones.filter((milestone) => {
    if (status === "completed") return milestone.completed;
    if (status === "pending") return !milestone.completed;
    return true;
  });

  // Merge duplicate milestones after filtering
  const mergedMilestones = mergeDuplicateMilestones(filteredMilestones);

  return (
    <div className="flex flex-col gap-6 w-full">
      {isAuthorized ? (
        <SetAnObjective
          hasObjectives={
            (mergedMilestones && mergedMilestones.length > 0) || false
          }
        />
      ) : null}

      {mergedMilestones && mergedMilestones.length > 0 ? (
        <div className="flex w-full flex-col gap-6 px-6 py-10 bg-[#F9FAFB] dark:bg-zinc-900 rounded-xl max-lg:px-2 max-lg:py-4">
          {mergedMilestones.map((milestone, index) => (
            <MilestoneCard
              key={`${milestone.id}-${index}-${milestone.title}`}
              milestone={milestone}
              isAuthorized={isAuthorized}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 justify-center items-start border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-8 w-full">
          <p className="text-zinc-900 font-bold text-center text-lg w-full dark:text-zinc-300">
            No milestones found!
          </p>
          <p className="text-zinc-900 dark:text-zinc-300 w-full text-center">
            {!isAuthorized
              ? "The project owner is working on setting milestones. Check back in a few days :)"
              : "Start creating milestones by clicking the 'Create' button above."}
          </p>
        </div>
      )}
    </div>
  );
};
