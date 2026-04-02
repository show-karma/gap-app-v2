"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import type { MilestoneStatusFilter } from "@/services/milestone-status-filter.service";
import { getActivityFilterType } from "@/services/project-profile.service";
import { useOwnerStore, useProjectStore } from "@/store";
import { ActivityFeed } from "../MainContent/ActivityFeed";
import { ActivityFilters, type ActivityFilterType } from "../MainContent/ActivityFilters";
import { ActivityFeedSkeleton } from "../Skeletons";

interface UpdatesContentProps {
  className?: string;
}

/**
 * UpdatesContent displays the activity feed and filters for the Updates tab.
 * Filter state is synced with URL for shareable links.
 */
export function UpdatesContent({ className }: UpdatesContentProps) {
  const { projectId } = useParams();
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read filter and sort state from URL
  const activeFilters = useMemo(() => {
    const filterParam = searchParams.get("filter");
    if (!filterParam) return [];
    return filterParam.split(",") as ActivityFilterType[];
  }, [searchParams]);

  // Read milestone status filter from URL
  const milestoneStatusFilter = useMemo(() => {
    const statusParam = searchParams.get("milestoneStatus");
    if (statusParam === "pending" || statusParam === "completed" || statusParam === "verified") {
      return statusParam;
    }
    return "all" as MilestoneStatusFilter;
  }, [searchParams]);

  // Pass milestoneStatus to useProjectProfile so filtering happens server-side
  const apiMilestoneStatus = milestoneStatusFilter !== "all" ? milestoneStatusFilter : undefined;
  const { allUpdates, milestonesCount, completedCount } = useProjectProfile(
    projectId as string,
    apiMilestoneStatus
  );

  // Count items per filter category for badge counters
  const counts = useMemo(() => {
    if (!allUpdates) return {} as Partial<Record<ActivityFilterType, number>>;
    return allUpdates.reduce<Partial<Record<ActivityFilterType, number>>>((acc, item) => {
      const filterType = getActivityFilterType(item);
      acc[filterType] = (acc[filterType] ?? 0) + 1;
      return acc;
    }, {});
  }, [allUpdates]);

  // Update URL when filters change
  const updateURL = useCallback(
    (newFilters: ActivityFilterType[]) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update filter param
      if (newFilters.length > 0) {
        params.set("filter", newFilters.join(","));
      } else {
        params.delete("filter");
      }
      params.delete("sort");

      const newURL = params.toString() ? `?${params.toString()}` : pathname;
      router.replace(newURL, { scroll: false });
    },
    [searchParams, router]
  );

  // Update URL when milestone status changes
  const handleMilestoneStatusChange = useCallback(
    (status: MilestoneStatusFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (status === "all") {
        params.delete("milestoneStatus");
      } else {
        params.set("milestoneStatus", status);
      }
      const newURL = params.toString() ? `?${params.toString()}` : pathname;
      router.replace(newURL, { scroll: false });
    },
    [searchParams, router]
  );

  const handleFilterToggle = useCallback(
    (filter: ActivityFilterType) => {
      const newFilters = activeFilters.includes(filter)
        ? activeFilters.filter((f) => f !== filter)
        : [...activeFilters, filter];
      updateURL(newFilters);
    },
    [activeFilters, updateURL]
  );

  // Show loading state while data is being fetched
  const isLoading = !allUpdates;

  return (
    <div className={className} data-testid="updates-content">
      {/* Filters */}
      <ActivityFilters
        activeFilters={activeFilters}
        onFilterToggle={handleFilterToggle}
        counts={counts}
        milestonesCount={milestonesCount}
        completedCount={completedCount}
        milestoneStatusFilter={milestoneStatusFilter}
        onMilestoneStatusChange={handleMilestoneStatusChange}
      />

      {/* Activity Feed with Suspense boundary */}
      <div className="mt-6">
        {isLoading ? (
          <ActivityFeedSkeleton itemCount={4} />
        ) : (
          <Suspense fallback={<ActivityFeedSkeleton itemCount={4} />}>
            <ActivityFeed
              milestones={allUpdates}
              isAuthorized={isAuthorized}
              activeFilters={activeFilters}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
