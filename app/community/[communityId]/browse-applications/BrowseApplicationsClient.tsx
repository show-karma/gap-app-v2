"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Lock, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ProgramWithConfig } from "@/features/programs/hooks/use-programs-with-config";
import { useProgramsWithConfig } from "@/features/programs/hooks/use-programs-with-config";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

interface BrowseApplicationsClientProps {
  communityId: string;
}

const statusOptions: Array<{
  value: ApplicationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "In Review" },
  { value: "revision_requested", label: "Revision Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function getStatusColor(status: ApplicationStatus): string {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "pending":
    case "resubmitted":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "under_review":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "revision_requested":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function formatStatusLabel(status: ApplicationStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function normalizeFieldKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, "");
}

function getProjectTitle(app: Application): string {
  const data = app.applicationData;
  for (const [key, value] of Object.entries(data)) {
    const nk = normalizeFieldKey(key);
    if (nk.includes("projectname") || nk.includes("projecttitle") || nk.includes("title")) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return app.referenceNumber;
}

function getRequestedAmount(applicationData: Record<string, unknown>): string | null {
  const preferredKeys = new Set([
    "requestedamount",
    "amountrequested",
    "fundingamount",
    "grantamount",
    "budget",
  ]);

  for (const [key, value] of Object.entries(applicationData ?? {})) {
    const normalizedKey = normalizeFieldKey(key);
    const matchesPreferred = preferredKeys.has(normalizedKey);
    const matchesPattern =
      normalizedKey.includes("amount") &&
      (normalizedKey.includes("requested") ||
        normalizedKey.includes("funding") ||
        normalizedKey.includes("grant"));

    if (!matchesPreferred && !matchesPattern) continue;

    if (typeof value === "number") {
      return `$${value.toLocaleString()}`;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const num = Number(value.replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(num) && num > 0) {
        return `$${num.toLocaleString()}`;
      }
      return value;
    }
  }
  return null;
}

function getCategoryTag(applicationData: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(applicationData ?? {})) {
    const nk = normalizeFieldKey(key);
    if (nk.includes("category") || nk.includes("track") || nk.includes("projecttype")) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
      if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0].trim();
      }
    }
  }
  return null;
}

interface ApplicationsPageData {
  applications: Application[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ApplicationCardMemo = memo(function ApplicationCardInner({
  application,
  communityId,
}: {
  application: Application;
  communityId: string;
}) {
  const projectName = getProjectTitle(application);
  const requestedAmount = getRequestedAmount(application.applicationData ?? {});
  const categoryTag = getCategoryTag(application.applicationData ?? {});
  const hasUpdates =
    Boolean(application.updatedAt) && application.updatedAt !== application.createdAt;
  const dateLabel = hasUpdates ? "Updated" : "Submitted";
  const dateValue = formatDate(hasUpdates ? application.updatedAt : application.createdAt);

  return (
    <Link
      href={`/community/${communityId}/browse-applications/${application.referenceNumber}`}
      className="block h-full"
    >
      <div className="flex h-full min-h-[220px] flex-col rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
        <div className="flex items-start justify-between gap-3 p-4 pb-2">
          <h3 className="line-clamp-3 flex-1 text-lg font-semibold text-foreground">
            {projectName}
          </h3>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
              getStatusColor(application.status)
            )}
          >
            {formatStatusLabel(application.status)}
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-between gap-4 px-4 pb-4 pt-0">
          <div className="flex flex-wrap gap-2">
            {categoryTag && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {categoryTag}
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {application.referenceNumber}
            </span>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {requestedAmount && (
              <p>
                Requested: <span className="font-medium text-foreground">{requestedAmount}</span>
              </p>
            )}
            <p>
              {dateLabel}: <span className="font-medium text-foreground">{dateValue}</span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
});

function LoadingSkeleton() {
  const skeletonKeys = ["bsk-1", "bsk-2", "bsk-3", "bsk-4", "bsk-5", "bsk-6"];
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {skeletonKeys.map((key) => (
        <div
          key={key}
          className="min-h-[220px] animate-pulse rounded-xl border border-border bg-card p-5"
        >
          <div className="space-y-3">
            <div className="h-5 w-4/5 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
          <div className="mt-4 h-6 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function BrowseApplicationsClient({ communityId }: BrowseApplicationsClientProps) {
  const searchParams = useSearchParams();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { programs, isLoading: isProgramsLoading } = useProgramsWithConfig(communityId);

  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    () => searchParams.get("programId") || ""
  );
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(() => {
    const s = searchParams.get("status");
    if (
      s &&
      ["pending", "under_review", "revision_requested", "approved", "rejected"].includes(s)
    ) {
      return s as ApplicationStatus;
    }
    return "all";
  });
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const selectedProgram = programs.find((p) => p.programId === selectedProgramId);
  const hasPrivateApplicationsSetting =
    selectedProgram?.applicationConfig?.formSchema?.settings?.privateApplications;

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ApplicationsPageData>({
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

        const [res, err] = await fetchData<ApplicationsPageData>(
          `/v2/funding-applications/program/${selectedProgramId}?page=${page}&limit=100${statusParam}${searchParam}`,
          "GET",
          {},
          {},
          {},
          false
        );
        if (err) throw new Error(err);
        return res as ApplicationsPageData;
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (lastPage.pagination.page < lastPage.pagination.totalPages) {
          return lastPage.pagination.page + 1;
        }
        return undefined;
      },
      enabled: !!selectedProgramId && !hasPrivateApplicationsSetting,
    });

  const applications = data?.pages.flatMap((page) => page.applications) || [];
  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
  }, []);

  const hasActiveFilters = statusFilter !== "all" || searchInput.length > 0;

  // Infinite scroll
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

  return (
    <div className="space-y-6" data-testid="applications-list">
      {/* Filter Bar */}
      <div className="rounded-xl border border-border p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="w-full lg:w-[320px]">
            <label
              htmlFor="program-select"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Funding Program
            </label>
            <select
              id="program-select"
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose a program...</option>
              {programs.map((program) => (
                <option key={program.programId} value={program.programId}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label
              htmlFor="search-input"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="search-input"
                type="text"
                placeholder="Search by project name or reference ID..."
                value={searchInput}
                disabled={!selectedProgramId}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="w-full sm:w-56 lg:w-52">
            <label
              htmlFor="status-select"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Status
            </label>
            <select
              id="status-select"
              value={statusFilter}
              disabled={!selectedProgramId}
              onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "all")}
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedProgramId && hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Applications Section */}
      {selectedProgramId ? (
        hasPrivateApplicationsSetting ? (
          <div className="rounded-xl border-2 border-dashed border-border py-12 text-center">
            <Lock className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">Private Applications</h3>
            <p className="mx-auto max-w-md text-muted-foreground">
              {selectedProgram?.name || "This program"} has configured their applications to be
              private. Application details are only visible to program administrators and
              applicants.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                Public Applications {!isLoading && `(${totalCount})`}
              </h2>
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
                  className="flex items-center gap-2 mx-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            ) : applications.length === 0 && statusFilter === "all" && !debouncedSearch ? (
              <div className="rounded-xl border-2 border-dashed border-border py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <span className="text-2xl text-muted-foreground">📄</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  No Applications Found
                </h3>
                <p className="text-muted-foreground">
                  This program doesn't have any public applications yet.
                </p>
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <span className="text-2xl text-muted-foreground">🔍</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  No Matching Applications
                </h3>
                <p className="text-muted-foreground">
                  {debouncedSearch && statusFilter !== "all"
                    ? "No applications match your filters. Try adjusting your search or status."
                    : debouncedSearch
                      ? "No applications match your search. Try a different project name or reference ID."
                      : "No applications match the selected status. Try a different status filter."}
                </p>
              </div>
            ) : (
              <div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
                  {applications.map((application) => (
                    <ApplicationCardMemo
                      key={application.referenceNumber}
                      application={application}
                      communityId={communityId}
                    />
                  ))}
                </div>

                {hasNextPage && (
                  <div ref={loadMoreRef} className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border py-10 text-center">
          <h3 className="mb-2 text-xl font-semibold text-foreground">Choose a Program</h3>
          <p className="text-muted-foreground">
            Choose a funding program to browse public applications.
          </p>
        </div>
      )}
    </div>
  );
}
