"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown, Lock, RefreshCw, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProjectTitle } from "@/components/FundingPlatform/helper/getProjectTitle";
import { useProgramsWithConfig } from "@/features/programs/hooks/use-programs-with-config";
import { Link } from "@/src/components/navigation/Link";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { cn } from "@/utilities/tailwind";

interface BrowseApplicationsClientProps {
  communityId: string;
}

const statusOptions: Array<{
  value: ApplicationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "revision_requested", label: "Needs info" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface StatusStyle {
  pill: string;
  dot: string;
  label: string;
}

const STATUS_STYLES: Record<ApplicationStatus, StatusStyle> = {
  under_review: {
    pill: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Under review",
  },
  pending: {
    pill: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Pending",
  },
  resubmitted: {
    pill: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
    dot: "bg-violet-500",
    label: "Resubmitted",
  },
  revision_requested: {
    pill: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-600",
    label: "Needs info",
  },
  approved: {
    pill: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Approved",
  },
  rejected: {
    pill: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    dot: "bg-red-600",
    label: "Rejected",
  },
  draft: {
    pill: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-500",
    label: "Draft",
  },
};

function StatusPill({ status }: { status: ApplicationStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        style.pill
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden />
      {style.label}
    </span>
  );
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

interface ProgramOption {
  programId: string;
  name: string;
}

function ProgramPillSelector({
  programs,
  selectedProgramId,
  onSelect,
}: {
  programs: ProgramOption[];
  selectedProgramId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = programs.find((p) => p.programId === selectedProgramId);
  const label = selected?.name ?? "Choose a program";

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800 transition hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/50"
      >
        <span className="max-w-[260px] truncate">{label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[360px] w-[300px] overflow-y-auto rounded-xl border border-border bg-background p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Program
          </div>
          {programs.map((p) => {
            const isActive = p.programId === selectedProgramId;
            return (
              <button
                key={p.programId}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSelect(p.programId);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                  isActive
                    ? "bg-brand-50 font-semibold text-foreground dark:bg-brand-900/30"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                <span className="truncate">{p.name}</span>
              </button>
            );
          })}
          {programs.length === 0 ? (
            <div className="px-2.5 py-3 text-sm text-muted-foreground">No programs available</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function BrowseApplicationsClient({ communityId }: BrowseApplicationsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { programs } = useProgramsWithConfig(communityId);

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedProgramId) params.set("programId", selectedProgramId);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [selectedProgramId, statusFilter, debouncedSearch, pathname, router]);

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

  const chipCounts: Record<ApplicationStatus | "all", number> = useMemo(() => {
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

  const headerSubtitle = selectedProgram
    ? `${programMetrics?.totalApplications ?? 0} application${
        (programMetrics?.totalApplications ?? 0) === 1 ? "" : "s"
      }${selectedProgram.name ? ` · ${selectedProgram.name}` : ""}`
    : "Choose a program to browse public applications.";

  return (
    <div
      className="space-y-6 [&>*]:animate-fade-in-up [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:80ms] [&>*:nth-child(3)]:[animation-delay:160ms] [&>*:nth-child(4)]:[animation-delay:240ms]"
      data-testid="applications-list"
    >
      {/* Header: title + program pill + subtitle */}
      <header className="relative z-30 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] text-foreground">
            Browse applications
          </h1>
          {programs.length > 0 ? (
            <ProgramPillSelector
              programs={programs.map((p) => ({ programId: p.programId, name: p.name }))}
              selectedProgramId={selectedProgramId}
              onSelect={setSelectedProgramId}
            />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
      </header>

      {selectedProgramId && statItems ? <StatStrip items={statItems} /> : null}

      {/* Filters: search + status chips inline */}
      {selectedProgramId && !hasPrivateApplicationsSetting ? (
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
      {selectedProgramId ? (
        hasPrivateApplicationsSetting ? (
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
