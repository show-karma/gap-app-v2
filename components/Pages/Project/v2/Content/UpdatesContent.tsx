"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import {
  isMilestoneStatusFilter,
  type MilestoneStatusFilter,
} from "@/services/milestone-status-filter.service";
import { getActivityFilterType } from "@/services/project-profile.service";
import { useOwnerStore, useProjectStore } from "@/store";
import type { UpdatesFeedFilters } from "@/types/v2/project-profile.types";
import { ActivityFeed } from "../MainContent/ActivityFeed";
import { ActivityFilters, type ActivityFilterType } from "../MainContent/ActivityFilters";
import { ActivityFeedSkeleton } from "../Skeletons";

interface UpdatesContentProps {
  className?: string;
}

/**
 * Parses a numeric query param. Returns the number if valid, otherwise undefined.
 */
function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
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
  const milestoneStatusFilter = useMemo<MilestoneStatusFilter>(() => {
    const statusParam = searchParams.get("milestoneStatus");
    return isMilestoneStatusFilter(statusParam) ? statusParam : "all";
  }, [searchParams]);

  // Read the 4 new filter params from URL
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;

  const hasAIEvaluation = useMemo(() => {
    const raw = searchParams.get("hasAIEvaluation");
    if (raw === "true") return true;
    if (raw === "false") return false;
    return undefined;
  }, [searchParams]);

  const aiScoreMin = useMemo(() => parseIntParam(searchParams.get("aiScoreMin")), [searchParams]);
  const aiScoreMax = useMemo(() => parseIntParam(searchParams.get("aiScoreMax")), [searchParams]);

  // Compose the extra filters object passed to the hook (omit undefined values)
  const feedFilters = useMemo((): UpdatesFeedFilters => {
    const f: UpdatesFeedFilters = {};
    if (dateFrom) f.dateFrom = dateFrom;
    if (dateTo) f.dateTo = dateTo;
    if (hasAIEvaluation !== undefined) f.hasAIEvaluation = hasAIEvaluation;
    if (aiScoreMin !== undefined) f.aiScoreMin = aiScoreMin;
    if (aiScoreMax !== undefined) f.aiScoreMax = aiScoreMax;
    return f;
  }, [dateFrom, dateTo, hasAIEvaluation, aiScoreMin, aiScoreMax]);

  // Pass milestoneStatus to useProjectProfile so filtering happens server-side
  const apiMilestoneStatus = milestoneStatusFilter !== "all" ? milestoneStatusFilter : undefined;
  const { allUpdates, milestonesCount, completedCount, isUpdating } = useProjectProfile(
    projectId as string,
    apiMilestoneStatus,
    feedFilters
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

      // Clear milestone status when milestones pill is toggled off; otherwise leave
      // whatever the user has already chosen (defaults to "all" when absent).
      if (!newFilters.includes("milestones")) {
        params.delete("milestoneStatus");
      }

      const newURL = params.toString() ? `?${params.toString()}` : pathname;
      router.replace(newURL, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Update URL when milestone status changes
  const handleMilestoneStatusChange = useCallback(
    (status: MilestoneStatusFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("milestoneStatus", status);
      const newURL = params.toString() ? `?${params.toString()}` : pathname;
      router.replace(newURL, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Update URL when date range changes.
  // Defensive swap (dateFrom > dateTo) happens in the service; we persist whatever the
  // UI agent provides so the URL is always in sync with the picker state.
  const handleDateRangeChange = useCallback(
    (from: string | undefined, to: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (from) {
        params.set("dateFrom", from);
      } else {
        params.delete("dateFrom");
      }
      if (to) {
        params.set("dateTo", to);
      } else {
        params.delete("dateTo");
      }
      const newURL = params.toString() ? `?${params.toString()}` : pathname;
      router.replace(newURL, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Update URL when AI evaluation filter changes.
  // Enforces the semantic rule: never persist hasAIEvaluation=false + any score param together.
  const handleAIFilterChange = useCallback(
    ({
      hasEvaluation,
      scoreMin,
      scoreMax,
    }: {
      hasEvaluation?: boolean;
      scoreMin?: number;
      scoreMax?: number;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      const hasAnyScore = scoreMin !== undefined || scoreMax !== undefined;

      if (hasAnyScore) {
        if (scoreMin !== undefined) {
          params.set("aiScoreMin", String(scoreMin));
        } else {
          params.delete("aiScoreMin");
        }
        if (scoreMax !== undefined) {
          params.set("aiScoreMax", String(scoreMax));
        } else {
          params.delete("aiScoreMax");
        }
        // Omit hasAIEvaluation=false when any score param is set
        if (hasEvaluation === true) {
          params.set("hasAIEvaluation", "true");
        } else {
          params.delete("hasAIEvaluation");
        }
      } else {
        params.delete("aiScoreMin");
        params.delete("aiScoreMax");
        if (hasEvaluation !== undefined) {
          params.set("hasAIEvaluation", hasEvaluation ? "true" : "false");
        } else {
          params.delete("hasAIEvaluation");
        }
      }

      const newURL = params.toString() ? `?${params.toString()}` : pathname;
      router.replace(newURL, { scroll: false });
    },
    [searchParams, router, pathname]
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

  // Show loading state while data is being fetched or filter is changing
  const isLoading = !allUpdates || isUpdating;

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
        dateFrom={dateFrom}
        dateTo={dateTo}
        hasAIEvaluation={hasAIEvaluation}
        aiScoreMin={aiScoreMin}
        aiScoreMax={aiScoreMax}
        onDateRangeChange={handleDateRangeChange}
        onAIFilterChange={handleAIFilterChange}
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
