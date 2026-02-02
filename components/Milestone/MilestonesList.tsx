"use client";

import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { Fragment, useCallback, useMemo, useState } from "react";
import { ActivityCard } from "@/components/Shared/ActivityCard";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useOwnerStore, useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import type { StatusOptions } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { mergeDuplicateMilestones } from "@/utilities/milestones/mergeDuplicateMilestones";
import { cn } from "@/utilities/tailwind";
import { ObjectivesSub } from "../Pages/Project/Objective/ObjectivesSub";

/** Number of milestones to show initially and per "Load More" click */
const MILESTONES_PER_PAGE = 15;

// Filter options for the content type filter
const CONTENT_TYPE_OPTIONS: Record<string, string> = {
  all: "All Updates",
  pending: "Pending Milestones",
  completed: "Completed Milestones",
  // impacts: "Project Impacts",
  activities: "Project Activity",
  updates: "Grant Updates",
};

/**
 * Skeleton component for a single milestone/activity item.
 * Matches the ActivityCard visual structure.
 */
function MilestoneItemSkeleton() {
  return (
    <div
      className="border bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-400 rounded-xl p-6 gap-3 flex flex-col"
      data-testid="milestone-item-skeleton"
    >
      {/* Title row */}
      <div className="flex flex-row gap-3 items-start justify-between w-full">
        <div className="flex flex-row gap-3 items-center w-full">
          <Skeleton className="w-2/3 h-6 pl-4 border-l-4 border-l-gray-300" />
          <Skeleton className="w-20 h-6 rounded-full" />
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1 w-full">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-2/3 h-4" />
      </div>

      {/* Footer */}
      <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-between w-full flex-wrap">
        <Skeleton className="w-48 h-5" />
        <Skeleton className="w-20 h-8 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for showing multiple milestone items during loading.
 */
function MilestonesLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6" data-testid="milestones-loading-skeleton">
      {Array.from({ length: count }, (_, i) => (
        <MilestoneItemSkeleton key={i} />
      ))}
    </div>
  );
}

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

  // Pagination state - tracks how many items to display
  const [visibleCount, setVisibleCount] = useState(MILESTONES_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Handle content type filter change - reset pagination when filter changes
  const handleContentTypeChange = (newContentType: string) => {
    setVisibleCount(MILESTONES_PER_PAGE);
    setSelectedContentTypeQuery(newContentType);
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

    // Merge duplicates for regular milestones (extracted pure function for memoization efficiency)
    return mergeDuplicateMilestones(filteredMilestones);
  }, [milestones, showAllTypes, status, selectedContentType]);

  // Apply pagination to the merged milestones
  const displayedMilestones = useMemo(
    () => unifiedMilestones.slice(0, visibleCount),
    [unifiedMilestones, visibleCount]
  );

  // Calculate pagination state
  const hasMore = visibleCount < unifiedMilestones.length;
  const remainingCount = unifiedMilestones.length - visibleCount;

  // Load more handler with simulated loading state for smooth UX
  const loadMore = useCallback(() => {
    setIsLoadingMore(true);
    // Small delay to show loading state and prevent rapid clicks
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + MILESTONES_PER_PAGE, unifiedMilestones.length));
      setIsLoadingMore(false);
    }, 300);
  }, [unifiedMilestones.length]);

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
        {displayedMilestones && displayedMilestones.length > 0 ? (
          <>
            {displayedMilestones.map((item, index) =>
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
            )}

            {/* Loading skeleton while fetching more */}
            {isLoadingMore && <MilestonesLoadingSkeleton count={3} />}

            {/* Load More button */}
            {hasMore && !isLoadingMore && (
              <div className="flex justify-center w-full mt-4">
                <button
                  type="button"
                  onClick={loadMore}
                  className="px-6 py-2.5 text-sm font-medium text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  aria-label={`Load ${Math.min(MILESTONES_PER_PAGE, remainingCount)} more items`}
                >
                  Load More ({remainingCount} remaining)
                </button>
              </div>
            )}
          </>
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
