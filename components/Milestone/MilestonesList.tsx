"use client";

import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { Fragment, useMemo } from "react";
import { ActivityCard } from "@/components/Shared/ActivityCard";
import { useOwnerStore, useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import type { StatusOptions } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { cn } from "@/utilities/tailwind";
import { ObjectivesSub } from "../Pages/Project/Objective/ObjectivesSub";

// Filter options for the content type filter
const CONTENT_TYPE_OPTIONS: Record<string, string> = {
  all: "All Updates",
  pending: "Pending Milestones",
  completed: "Completed Milestones",
  // impacts: "Project Impacts",
  activities: "Project Activity",
  updates: "Grant Updates",
};

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
    parse: (value) => (value ? (value as StatusOptions) : ("all" as StatusOptions)),
  });

  const _router = useRouter();
  const _pathname = usePathname();
  const _searchParams = useSearchParams();

  // Content type filter with URL search params support
  const [selectedContentType, setSelectedContentTypeQuery] = useQueryState("contentType", {
    defaultValue: "all",
    serialize: (value) => value,
    parse: (value) => value || "all",
  });

  // Handle content type filter change
  const handleContentTypeChange = (newContentType: string) => {
    setSelectedContentTypeQuery(newContentType);
  };

  // Merge duplicate milestones based on content
  const mergeDuplicateMilestones = (milestones: UnifiedMilestone[]): UnifiedMilestone[] => {
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
          chainID: milestone.chainID || 0,
          refUID: milestone.source.projectMilestone?.uid || milestone.refUID || "",
        });
        return;
      }

      // Create a unique key based on title, description, and dates
      const startDate = milestone.startsAt;
      const endDate = milestone.endsAt;

      const key = `${milestone.title}|${milestone.description || ""}|${
        startDate || ""
      }|${endDate || ""}`;

      if (mergedMap.has(key)) {
        // Milestone exists, add this grant to the merged list
        const existingMilestone = mergedMap.get(key)!;

        if (!existingMilestone.mergedGrants) {
          // Initialize mergedGrants if this is the first duplicate
          const firstGrant = existingMilestone.source.grantMilestone;
          const firstGrantDetails = firstGrant?.grant.details as
            | { title?: string; programId?: string }
            | undefined;
          const firstCommunityDetails = firstGrant?.grant.community?.details as
            | { name?: string; imageURL?: string }
            | undefined;
          existingMilestone.mergedGrants = [
            {
              grantUID: firstGrant?.grant.uid || "",
              grantTitle: firstGrantDetails?.title,
              communityName: firstCommunityDetails?.name,
              communityImage: firstCommunityDetails?.imageURL,
              chainID: firstGrant?.grant.chainID || 0,
              milestoneUID: firstGrant?.milestone.uid || "",
              programId: firstGrantDetails?.programId,
            },
          ];
        }

        // Add the current grant to the merged list
        const currentGrantDetails = milestone.source.grantMilestone?.grant.details as
          | { title?: string; programId?: string }
          | undefined;
        const currentCommunityDetails = milestone.source.grantMilestone?.grant.community?.details as
          | { name?: string; imageURL?: string }
          | undefined;
        existingMilestone.mergedGrants.push({
          grantUID: milestone.source.grantMilestone?.grant.uid || "",
          grantTitle: currentGrantDetails?.title,
          communityName: currentCommunityDetails?.name,
          communityImage: currentCommunityDetails?.imageURL,
          chainID: milestone.source.grantMilestone?.grant.chainID || 0,
          milestoneUID: milestone.source.grantMilestone?.milestone.uid || "",
          programId: currentGrantDetails?.programId,
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

  const isUpdateType = (item: UnifiedMilestone): boolean => {
    return (
      item.type === "update" ||
      item.type === "impact" ||
      item.type === "activity" ||
      item.type === "grant_update"
    );
  };

  const hasProjectUpdate = (item: UnifiedMilestone): boolean => {
    return item.type === "activity" && !!item.projectUpdate;
  };

  const hasSdkUpdate = (item: UnifiedMilestone): boolean => {
    return (
      (item.type === "grant_update" && !!item.grantUpdate) ||
      (item.type === "impact" && !!item.projectImpact)
    );
  };

  // Memoize the filtered and unified milestones for better performance
  const unifiedMilestones = useMemo(() => {
    // Filter milestones based on status and content type
    const filteredMilestones = milestones.filter((milestone) => {
      if (!showAllTypes && milestone.type === "update") return false;

      // Apply status filter
      if (status === "completed") {
        const isCompleted =
          milestone.completed === true ||
          (milestone.completed && typeof milestone.completed === "object");
        if (!isCompleted) return false;
      }
      if (status === "pending") {
        if (milestone.completed) return false;
      }

      // Apply content type filter
      if (selectedContentType !== "all") {
        switch (selectedContentType) {
          case "pending": {
            const isPending = milestone.completed === false;
            const isMilestoneType =
              milestone.type === "milestone" ||
              milestone.type === "grant" ||
              milestone.type === "project";
            return isPending && isMilestoneType;
          }

          case "completed": {
            const isCompleted =
              milestone.completed === true ||
              (milestone.completed && typeof milestone.completed === "object");
            const isMilestoneTypeCompleted =
              milestone.type === "milestone" ||
              milestone.type === "grant" ||
              milestone.type === "project";
            return isCompleted && isMilestoneTypeCompleted;
          }

          case "impacts":
            return milestone.type === "impact";

          case "activities":
            return milestone.type === "activity";

          case "updates":
            return milestone.type === "grant_update";

          default:
            return true;
        }
      }

      return true;
    });

    // Merge duplicates for regular milestones
    return mergeDuplicateMilestones(filteredMilestones);
  }, [milestones, showAllTypes, status, selectedContentType, mergeDuplicateMilestones]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex w-full flex-col gap-6 rounded-xl max-lg:px-2 max-lg:py-4">
        <div className="flex flex-col gap-2 flex-wrap justify-start items-start mb-2">
          <div className="flex flex-row gap-4 flex-wrap justify-between items-center w-full">
            <Listbox value={selectedContentType} onChange={handleContentTypeChange}>
              <div className="relative">
                <Listbox.Button className="cursor-pointer items-center relative w-full rounded-md pr-8 text-left sm:text-sm sm:leading-6 text-base font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2">
                  <span className="flex flex-row gap-1 ">
                    {CONTENT_TYPE_OPTIONS[selectedContentType] === "All Updates"
                      ? `All Updates ${totalItems ? `(${totalItems})` : ""}`
                      : CONTENT_TYPE_OPTIONS[selectedContentType]}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Listbox.Button>

                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute left-0 z-50 mt-1 max-h-60 w-max overflow-auto rounded-md bg-white py-1 text-base dark:bg-zinc-800 dark:text-zinc-200 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {Object.keys(CONTENT_TYPE_OPTIONS).map((contentType) => (
                      <Listbox.Option
                        key={contentType}
                        className={({ active }) =>
                          cn(
                            active
                              ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                              : "text-gray-900 dark:text-gray-200",
                            "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                          )
                        }
                        value={contentType}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={cn(
                                selected ? "font-semibold" : "font-normal",
                                "block truncate"
                              )}
                            >
                              {CONTENT_TYPE_OPTIONS[contentType]}
                            </span>

                            {selected ? (
                              <span
                                className={cn(
                                  "text-blue-600 dark:text-blue-400",
                                  "absolute inset-y-0 right-0 flex items-center pr-4"
                                )}
                              >
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
            <ObjectivesSub />
          </div>

          {/* Content Type Filter */}
        </div>
        {unifiedMilestones && unifiedMilestones.length > 0 ? (
          unifiedMilestones.map((item, index) =>
            hasProjectUpdate(item) && item.projectUpdate ? (
              <ActivityCard
                key={`update-${item.uid}-${index}`}
                activity={{
                  type: "projectUpdate",
                  data: item.projectUpdate,
                  index: index,
                }}
                isAuthorized={isAuthorized}
              />
            ) : hasSdkUpdate(item) ? (
              <ActivityCard
                key={`sdk-update-${item.uid}-${index}`}
                activity={{
                  type: "update",
                  data: item.grantUpdate || item.projectImpact!,
                  index: index,
                }}
                isAuthorized={isAuthorized}
              />
            ) : (
              <ActivityCard
                key={`milestone-${item.uid}-${index}`}
                activity={{ type: "milestone", data: item }}
                isAuthorized={isAuthorized}
              />
            )
          )
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
    </div>
  );
};
