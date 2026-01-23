"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { useProjectStore } from "@/store";
import { ActivityFeed } from "../MainContent/ActivityFeed";
import {
  ActivityFilters,
  type ActivityFilterType,
  type SortOption,
} from "../MainContent/ActivityFilters";

interface UpdatesContentProps {
  className?: string;
}

/**
 * UpdatesContent displays the activity feed and filters for the Updates tab.
 * Filter state is synced with URL for shareable links.
 */
export function UpdatesContent({ className }: UpdatesContentProps) {
  const { projectId } = useParams();
  const { isProjectAdmin } = useProjectStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { allUpdates, completedCount } = useProjectProfile(projectId as string);

  // Read filter and sort state from URL
  const activeFilters = useMemo(() => {
    const filterParam = searchParams.get("filter");
    if (!filterParam) return [];
    return filterParam.split(",") as ActivityFilterType[];
  }, [searchParams]);

  const sortBy = useMemo(() => {
    const sortParam = searchParams.get("sort");
    return (sortParam === "oldest" ? "oldest" : "newest") as SortOption;
  }, [searchParams]);

  // Update URL when filters change
  const updateURL = useCallback(
    (newFilters: ActivityFilterType[], newSort: SortOption) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update filter param
      if (newFilters.length > 0) {
        params.set("filter", newFilters.join(","));
      } else {
        params.delete("filter");
      }

      // Update sort param (only if not default)
      if (newSort !== "newest") {
        params.set("sort", newSort);
      } else {
        params.delete("sort");
      }

      const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
      router.replace(newURL, { scroll: false });
    },
    [searchParams, router]
  );

  const handleFilterToggle = useCallback(
    (filter: ActivityFilterType) => {
      const newFilters = activeFilters.includes(filter)
        ? activeFilters.filter((f) => f !== filter)
        : [...activeFilters, filter];
      updateURL(newFilters, sortBy);
    },
    [activeFilters, sortBy, updateURL]
  );

  const handleSortChange = useCallback(
    (newSort: SortOption) => {
      updateURL(activeFilters, newSort);
    },
    [activeFilters, updateURL]
  );

  return (
    <div className={className} data-testid="updates-content">
      {/* Filters */}
      <ActivityFilters
        sortBy={sortBy}
        onSortChange={handleSortChange}
        activeFilters={activeFilters}
        onFilterToggle={handleFilterToggle}
        milestonesCount={allUpdates.length}
        completedCount={completedCount}
      />

      {/* Activity Feed */}
      <div className="mt-6">
        <ActivityFeed
          milestones={allUpdates}
          isAuthorized={isProjectAdmin}
          sortBy={sortBy}
          activeFilters={activeFilters}
        />
      </div>
    </div>
  );
}
