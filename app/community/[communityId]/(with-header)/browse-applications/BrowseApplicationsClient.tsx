"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Lock, RefreshCw, Search, X } from "lucide-react";
import pluralize from "pluralize";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProjectTitle } from "@/components/FundingPlatform/helper/getProjectTitle";
import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
import { TrackAsProgramFilter } from "@/components/Pages/Communities/Impact/TrackAsProgramFilter";
import { useProgramsWithConfig } from "@/features/programs/hooks/use-programs-with-config";
import { useApplicationsByTrack } from "@/hooks/useApplicationsByTrack";
import { useBrowseApplicationFilters } from "@/hooks/useBrowseApplicationFilters";
import { Link } from "@/src/components/navigation/Link";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import {
  EXPLORER_NAV_OVERRIDES,
  isTracksAsPrimaryExplorerFacet,
} from "@/utilities/community-flags";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { cn } from "@/utilities/tailwind";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { StatusPill } from "./BrowseApplicationsTable";

interface BrowseApplicationsClientProps {
  communityId: string;
}

/**
 * Tab id this page belongs to. Heading and tab both resolve their wording from
 * it — the default out of COMMUNITY_NAV_LABELS, the override out of
 * EXPLORER_NAV_OVERRIDES — so the two can never drift apart.
 */
const NAV_ITEM_ID = "browse-applications";

/**
 * The page heading, plus the noun its subtitle should count.
 *
 * A community that renames the explorer tab gets the same wording here, so tab
 * and page agree. Gated on `isWhitelabel` for the same reason the tab bar is:
 * the rename belongs to the tenant's own host (see EXPLORER_NAV_OVERRIDES).
 *
 * The heading reads "Browse <things>", so the last word is the thing being
 * counted — deriving the noun from the heading is what stops "Browse Projects"
 * from sitting above a count of applications.
 */
const resolveHeading = (communityId: string, isWhitelabel: boolean) => {
  const title =
    (isWhitelabel ? EXPLORER_NAV_OVERRIDES[communityId]?.tabLabels?.[NAV_ITEM_ID] : undefined) ??
    COMMUNITY_NAV_LABELS[NAV_ITEM_ID];
  return { title, noun: pluralize.singular(title.split(" ").pop() ?? "").toLowerCase() };
};

const statusOptions: Array<{
  value: ApplicationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "revision_requested", label: "Needs info" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
];

interface ApplicationsPageData {
  applications: Application[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ApplicationRowMemo = memo(function ApplicationRowInner({
  application,
  communityId,
}: {
  application: Application;
  communityId: string;
}) {
  const projectName = getProjectTitle(application);
  const submitted = application.createdAt;
  const href = `/community/${communityId}/browse-applications/${application.referenceNumber}`;

  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/40 last:border-b-0">
      <td className="px-4 py-3.5 align-middle">
        <Link
          href={href}
          className="block font-semibold tracking-[-0.01em] text-foreground hover:underline"
        >
          {projectName}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono text-[11px]">{application.referenceNumber}</span>
          {submitted ? (
            <>
              <span aria-hidden>·</span>
              <span>submitted {renderRelativeTime(submitted, "")}</span>
            </>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3.5 align-middle">
        <StatusPill status={application.status} />
      </td>
      <td className="px-4 py-3.5 align-middle text-right">
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
        >
          View
          <span aria-hidden>→</span>
        </Link>
      </td>
    </tr>
  );
});

function LoadingSkeleton() {
  const skeletonKeys = ["bsk-1", "bsk-2", "bsk-3", "bsk-4", "bsk-5", "bsk-6"];
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Project
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground" />
          </tr>
        </thead>
        <tbody>
          {skeletonKeys.map((key) => (
            <tr key={key} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3.5">
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-muted/60" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
              </td>
              <td className="px-4 py-3.5 text-right">
                <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface StatCardItem {
  label: string;
  value: number;
  accentClass: string;
}

function StatStrip({ items }: { items: StatCardItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-background px-4 py-3.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {item.label}
          </div>
          <div
            className={cn(
              "mt-0.5 text-2xl font-semibold tracking-[-0.02em] tabular-nums",
              item.accentClass
            )}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BrowseApplicationsClient({ communityId }: BrowseApplicationsClientProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { programs } = useProgramsWithConfig(communityId);
  const { isWhitelabel } = useWhitelabel();

  const { title: pageTitle, noun: itemNoun } = resolveHeading(communityId, isWhitelabel);

  // The query string is the single source of truth for these filters (see
  // useBrowseApplicationFilters): nuqs writes through history.replaceState, so
  // updating a filter never races or cancels a Link click (issue #1547).
  const {
    programId: selectedProgramId,
    setProgramId: setSelectedProgramId,
    trackId: selectedTrackId,
    setTrackId: setSelectedTrackId,
    status: statusFilter,
    setStatus: setStatusFilter,
    search: searchInput,
    setSearch: setSearchInput,
  } = useBrowseApplicationFilters();

  // Filecoin browses this tab by track, matching its projects explorer. An
  // application has no track of its own — it inherits the one its funded
  // project carries, so the two queries below resolve the track's projects and
  // keep the applications pointing at them.
  const tracksAsPrimaryFacet = isTracksAsPrimaryExplorerFacet(communityId);

  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);

  // Debounce only the value that drives the API query; the URL write is already
  // throttled by nuqs and the input stays responsive via the optimistic value.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const byTrack = useApplicationsByTrack({
    communityId,
    enabled: tracksAsPrimaryFacet,
    trackId: selectedTrackId,
    programs,
    status: statusFilter,
    search: debouncedSearch,
    getTitle: getProjectTitle,
  });

  const selectedProgram = programs.find((p) => p.programId === selectedProgramId);
  const hasPrivateApplicationsSetting =
    selectedProgram?.applicationConfig?.formSchema?.settings?.privateApplications;

  const programMetrics = selectedProgram?.metrics;

  const statItems: StatCardItem[] | null = useMemo(() => {
    if (!programMetrics) return null;
    const total = programMetrics.totalApplications ?? 0;
    const pending = programMetrics.pendingApplications ?? 0;
    const review = programMetrics.underReviewApplications ?? 0;
    const revision = programMetrics.revisionRequestedApplications ?? 0;
    const approved = programMetrics.approvedApplications ?? 0;
    return [
      { label: "Total", value: total, accentClass: "text-foreground" },
      { label: "Awaiting review", value: pending, accentClass: "text-blue-600 dark:text-blue-400" },
      { label: "In review", value: review, accentClass: "text-violet-600 dark:text-violet-400" },
      {
        label: "Needs info",
        value: revision,
        accentClass: "text-amber-600 dark:text-amber-400",
      },
      {
        label: "Approved",
        value: approved,
        accentClass: "text-emerald-600 dark:text-emerald-400",
      },
    ];
  }, [programMetrics]);

  const programChipCounts: Record<ApplicationStatus | "all", number> = useMemo(() => {
    return {
      all: programMetrics?.totalApplications ?? 0,
      pending: programMetrics?.pendingApplications ?? 0,
      under_review: programMetrics?.underReviewApplications ?? 0,
      revision_requested: programMetrics?.revisionRequestedApplications ?? 0,
      approved: programMetrics?.approvedApplications ?? 0,
      rejected: programMetrics?.rejectedApplications ?? 0,
      resubmitted: 0,
      draft: 0,
    };
  }, [programMetrics]);

  const {
    data,
    isLoading: isProgramLoading,
    error: programError,
    refetch: refetchProgram,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ApplicationsPageData>({
    queryKey: [
      "wl-browse-applications",
      communityId,
      selectedProgramId,
      statusFilter,
      debouncedSearch,
    ],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const statusParam = statusFilter === "all" ? "" : `&status=${statusFilter}`;
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";

      // TODO(#1775): add zod schema
      return await api.get<ApplicationsPageData>(
        `/v2/funding-applications/program/${selectedProgramId}?page=${page}&limit=100${statusParam}${searchParam}`,
        { isAuthorized: false }
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    enabled: !tracksAsPrimaryFacet && !!selectedProgramId && !hasPrivateApplicationsSetting,
    // Re-selecting a status chip you already viewed serves the cached page
    // instead of re-hitting the API on every toggle.
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const applications = tracksAsPrimaryFacet
    ? byTrack.applications
    : data?.pages.flatMap((page) => page.applications) || [];
  const totalCount = tracksAsPrimaryFacet
    ? byTrack.totalCount
    : (data?.pages[0]?.pagination.total ?? 0);

  const isLoading = tracksAsPrimaryFacet ? byTrack.isLoading : isProgramLoading;
  const error = tracksAsPrimaryFacet ? byTrack.error : programError;
  const refetch = tracksAsPrimaryFacet ? byTrack.refetch : refetchProgram;
  /**
   * Whether there is a list to show. Browsing by track always has one: no track
   * selected is the dropdown's "All Programs" option, which lists every public
   * application. Browsing by program still needs a program — that dropdown has
   * no "all" option and each program is a separate API call.
   */
  const hasSelection = tracksAsPrimaryFacet || !!selectedProgramId;
  const showPrivateNotice = !tracksAsPrimaryFacet && Boolean(hasPrivateApplicationsSetting);
  const selectedTrackName = byTrack.trackName;

  const chipCounts = tracksAsPrimaryFacet ? byTrack.chipCounts : programChipCounts;

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
  }, []);

  const hasActiveFilters = statusFilter !== "all" || searchInput.length > 0;

  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "100px", threshold: 0.1 }
    );

    observer.observe(currentRef);
    return () => {
      observer.unobserve(currentRef);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // In track mode the count is the loaded track, not a program's metrics, and
  // the trailing name is the track the user picked.
  const applicationCount = tracksAsPrimaryFacet
    ? totalCount
    : (programMetrics?.totalApplications ?? 0);
  const selectionName = tracksAsPrimaryFacet ? selectedTrackName : selectedProgram?.name;
  const headerSubtitle = hasSelection
    ? `${applicationCount} ${pluralize(itemNoun, applicationCount)}${
        selectionName ? ` · ${selectionName}` : ""
      }`
    : `Choose a program to browse public ${pluralize(itemNoun, 2)}.`;

  return (
    <div
      className="space-y-6 [&>*]:animate-fade-in-up [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:80ms] [&>*:nth-child(3)]:[animation-delay:160ms] [&>*:nth-child(4)]:[animation-delay:240ms]"
      data-testid="applications-list"
    >
      {/* Header: title + subtitle */}
      <header className="flex flex-col gap-2">
        <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] text-foreground">
          {pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
      </header>

      {/* Program selector: same labeled dropdown used on projects/updates/financials */}
      {tracksAsPrimaryFacet ? (
        <div className="w-[260px] max-lg:w-full">
          <TrackAsProgramFilter
            communityUid={byTrack.communityUid}
            selectedTrackId={selectedTrackId || null}
            onChange={(trackId) => setSelectedTrackId(trackId ?? "")}
          />
        </div>
      ) : programs.length > 0 ? (
        <div className="flex w-[260px] flex-col gap-1.5 max-lg:w-full">
          <label
            htmlFor="browse-applications-program"
            className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
          >
            Choose Program
          </label>
          <SearchWithValueDropdown
            id="browse-applications-program"
            list={programs.map((p) => ({ title: p.name, value: p.programId }))}
            onSelectFunction={(value: string) => setSelectedProgramId(value)}
            type="Program"
            selected={selectedProgram ? [selectedProgram.name] : []}
            prefixUnselected="Select"
            buttonClassname="w-full max-w-full"
            isMultiple={false}
          />
        </div>
      ) : null}

      {hasSelection && statItems ? <StatStrip items={statItems} /> : null}

      {/* Filters: search + status chips inline */}
      {hasSelection && !showPrivateNotice ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <label htmlFor="application-search" className="sr-only">
              Search applications
            </label>
            <input
              id="application-search"
              type="text"
              placeholder="Search project or reference…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 w-64 rounded-lg border border-border bg-background pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {searchInput ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <fieldset className="flex flex-wrap gap-1.5 border-0 p-0 m-0">
            <legend className="sr-only">Filter by status</legend>
            {statusOptions.map((option) => {
              const isActive = statusFilter === option.value;
              const count = chipCounts[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setStatusFilter(option.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground/30"
                  )}
                >
                  {option.label}
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      isActive ? "opacity-70" : "text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </fieldset>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Applications table / empty / error / private */}
      {hasSelection ? (
        showPrivateNotice ? (
          <div className="rounded-xl border-2 border-dashed border-border py-12 text-center">
            <Lock className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">Private applications</h3>
            <p className="mx-auto max-w-md text-muted-foreground">
              {selectedProgram?.name || "This program"} has configured their applications to be
              private. Application details are only visible to program administrators and
              applicants.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-[-0.015em] text-foreground">
                Public applications
              </h2>
              {!isLoading && totalCount > 0 ? (
                <span className="text-sm tabular-nums text-muted-foreground">
                  {totalCount} total
                </span>
              ) : null}
            </div>

            {isLoading ? (
              <LoadingSkeleton />
            ) : error ? (
              <div className="rounded-xl border border-border p-8 text-center">
                <p className="mb-4 text-red-600 dark:text-red-400">
                  Something went wrong while loading applications. Please try again.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mx-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            ) : applications.length === 0 && !hasActiveFilters ? (
              <div className="rounded-xl border-2 border-dashed border-border py-12 text-center">
                <h3 className="mb-2 text-xl font-semibold text-foreground">No applications yet</h3>
                <p className="text-muted-foreground">
                  This program doesn't have any public applications yet.
                </p>
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-xl border border-border py-12 text-center text-muted-foreground">
                No applications match the current filters — try adjusting your search or status.
              </div>
            ) : (
              <div>
                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  <table className="w-full">
                    <thead className="bg-muted/40">
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                          Project
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground" />
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((application) => (
                        <ApplicationRowMemo
                          key={application.referenceNumber}
                          application={application}
                          communityId={communityId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasNextPage ? (
                  <div ref={loadMoreRef} className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border py-10 text-center">
          <h3 className="mb-2 text-xl font-semibold text-foreground">Choose a program</h3>
          <p className="text-muted-foreground">
            Pick a funding program from the selector above to browse its public applications.
          </p>
        </div>
      )}
    </div>
  );
}
