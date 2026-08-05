"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import {
  isMilestoneStatusFilter,
  type MilestoneStatusFilter,
} from "@/services/milestone-status-filter.service";
import { getActivityFilterType } from "@/services/project-profile.service";
import type { UpdatesFeedFilters } from "@/types/v2/project-profile.types";
import { ActivityFeed } from "../MainContent/ActivityFeed";
import { ActivityFilters, type ActivityFilterType } from "../MainContent/ActivityFilters";
import { ActivityFeedSkeleton } from "../Skeletons";

interface UpdatesContentProps {
  className?: string;
  /** Server-rendered read-only twin of the feed (ActivityFeedStatic), shown in
   *  the initial HTML and until this client component mounts — then the
   *  interactive feed replaces it. Lets crawlers see the real feed content. */
  serverFeed?: ReactNode;
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
export function UpdatesContent({ className, serverFeed }: UpdatesContentProps) {
  const { projectId } = useParams();
  const { isAuthorized } = useProjectAuthorization();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Keep the server-rendered feed twin in place through the client's first
  // render so SSR and hydration match, then swap to the interactive feed after
  // mount. Without this gate the server (serverFeed) and client (ActivityFeed)
  // markup would differ on hydration and React would throw a mismatch.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

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
  const { allUpdates, milestonesCount, completedCount, isUpdating, isUpdatesError, refetch } =
    useProjectProfile(projectId as string, apiMilestoneStatus, feedFilters);

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

  const hasUpdates = (allUpdates?.length ?? 0) > 0;

  /**
   * Keep the server-rendered feed on screen until the client query actually
   * produces something. It used to be discarded the moment this component
   * hydrated, so a slow, hanging or failed updates request made real content
   * vanish into a skeleton that never resolved — `allUpdates` is always an
   * array, so the old `!allUpdates` guard was dead and only `isUpdating`
   * drove the skeleton, and a request that never settles never clears it.
   */
  const showServerFeed = Boolean(serverFeed) && !hasUpdates;

  // Skeleton while a fetch is genuinely in flight (initial load or a filter
  // change). Distinct from the error branch below, which is terminal.
  const isLoading = isUpdating;

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

      {/* Activity Feed with Suspense boundary. Before hydration we render the
          server-rendered twin (serverFeed) so SSR and the client's first render
          match; after mount the interactive feed takes over. */}
      {/* The error affordance is ALWAYS rendered when the updates query fails,
          even if stale or server-prefetched data is still on screen. QA found
          that suppressing it whenever data existed left a blocked request
          looking like an ordinary page — the filters quietly went inert with no
          message and no way to retry. Content stays below; this sits above it. */}
      {isUpdatesError ? (
        <div
          className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-border p-6 text-center"
          role="alert"
          data-testid="updates-content-error"
        >
          <p className="text-sm text-muted-foreground">
            {hasUpdates
              ? "We couldn't refresh this project's updates, so you may be seeing older activity."
              : "We couldn't load this project's updates."}
          </p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue/90"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="mt-6">
        {(!hydrated || showServerFeed) && serverFeed ? (
          serverFeed
        ) : isUpdatesError && !hasUpdates ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border border-border p-8 text-center"
            data-testid="updates-content-empty-after-error"
          >
            <p className="text-sm text-muted-foreground">No updates to show right now.</p>
          </div>
        ) : isLoading ? (
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
