"use client";

import { AlertCircle, RefreshCw, Search } from "lucide-react";
import Image from "next/image";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import {
  computeProgramView,
  EditorialProgramCard,
} from "@/components/Pages/Communities/Funding/EditorialProgramCard";
import { FeaturedProgram } from "@/components/Pages/Communities/Funding/FeaturedProgram";
import { PageHero } from "@/components/Pages/Communities/PageHero";
import { ProgramCardSkeleton } from "@/src/features/programs/components/ProgramCardSkeleton";
import { usePrograms } from "@/src/features/programs/hooks/use-programs";
import type { ProgramStatus } from "@/types/whitelabel-entities";
import formatCurrency from "@/utilities/formatCurrency";
import { cn } from "@/utilities/tailwind";

const STATUS_TABS: Array<{ key: ProgramStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Open" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ended", label: "Closed" },
];

const VALID_STATUSES: ReadonlyArray<ProgramStatus | "all"> = ["all", "active", "upcoming", "ended"];

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

export default function FundingOpportunitiesPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { programs, loading, error, filters, setFilters, refetch } = usePrograms(communityId);

  const urlStatusRaw = searchParams.get("status");
  const urlStatus: ProgramStatus | "all" | null =
    urlStatusRaw && (VALID_STATUSES as readonly string[]).includes(urlStatusRaw)
      ? (urlStatusRaw as ProgramStatus | "all")
      : null;
  const urlSearch = searchParams.get("q") ?? "";

  // Seed filter store from URL on mount / when URL changes externally.
  useEffect(() => {
    const desiredStatus = urlStatus === "all" || urlStatus === null ? undefined : urlStatus;
    const desiredSearch = urlSearch || undefined;
    if (filters.status !== desiredStatus || filters.search !== desiredSearch) {
      setFilters({ ...filters, status: desiredStatus, search: desiredSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStatus, urlSearch]);

  const writeUrl = useCallback(
    (next: { status?: ProgramStatus | "all"; search?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.status && next.status !== "all") {
        params.set("status", next.status);
      } else {
        params.delete("status");
      }
      if (next.search?.trim()) {
        params.set("q", next.search.trim());
      } else {
        params.delete("q");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const stats = useMemo(() => {
    let totalPool = 0;
    let openCount = 0;
    let closingNow = 0;
    let applicants = 0;
    for (const p of programs) {
      const v = computeProgramView(p);
      totalPool += v.pool;
      applicants += v.applicants;
      if (v.status === "open") openCount += 1;
      if (v.urgency === "urgent" || v.urgency === "closing") closingNow += 1;
    }
    return { totalPool, openCount, closingNow, applicants };
  }, [programs]);

  const featured = programs[0];
  const others = programs;
  const activeStatus: ProgramStatus | "all" = filters.status ?? "all";

  return (
    <div className="flex flex-col gap-10 pb-20 [&>*]:animate-fade-in-up [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:80ms] [&>*:nth-child(3)]:[animation-delay:160ms]">
      {loading ? (
        <FundingHeroSkeleton />
      ) : (
        <PageHero
          eyebrow={
            stats.openCount > 0
              ? `Open for funding · ${stats.openCount} live program${stats.openCount === 1 ? "" : "s"}`
              : "Funding opportunities"
          }
          title={
            stats.totalPool > 0 ? (
              <>
                ${formatCurrency(stats.totalPool)} available
                <br />
                <span className="text-brand-500 dark:text-brand-400">
                  across {programs.length} program{programs.length === 1 ? "" : "s"}.
                </span>
              </>
            ) : (
              <>Funding opportunities</>
            )
          }
          description="Browse open programs, review their criteria, and apply for grants supporting work in this community."
          kpis={[
            {
              label: "Open programs",
              value: stats.openCount,
              sub: "accepting now",
            },
            {
              label: "Closing this week",
              value: stats.closingNow,
              sub: "apply before deadline",
              accent: stats.closingNow > 0 ? "danger" : "default",
            },
            {
              label: "Total pool",
              value: stats.totalPool > 0 ? `$${formatCurrency(stats.totalPool)}` : "—",
              sub: "across all rounds",
            },
            {
              label: "Applicants",
              value: stats.applicants,
              sub: "this round",
            },
          ]}
        />
      )}

      <ProgramsContent
        communityId={communityId}
        loading={loading}
        error={error}
        programs={programs}
        featured={featured}
        others={others}
        activeStatus={activeStatus}
        searchValue={filters.search ?? ""}
        onSearchChange={(v) => {
          setFilters({ ...filters, search: v || undefined });
          writeUrl({ status: activeStatus, search: v });
        }}
        onStatusChange={(key) => {
          setFilters({ ...filters, status: key === "all" ? undefined : key });
          writeUrl({ status: key, search: filters.search });
        }}
        onClearFilters={() => {
          setFilters({ ...filters, status: undefined, search: undefined });
          writeUrl({ status: "all", search: "" });
        }}
        onRetry={refetch}
      />
    </div>
  );
}

interface ProgramsContentProps {
  communityId: string;
  loading: boolean;
  error: Error | null;
  programs: ReturnType<typeof usePrograms>["programs"];
  featured: ReturnType<typeof usePrograms>["programs"][number] | undefined;
  others: ReturnType<typeof usePrograms>["programs"];
  activeStatus: ProgramStatus | "all";
  searchValue: string;
  onSearchChange: (v: string) => void;
  onStatusChange: (key: ProgramStatus | "all") => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

function ProgramsContent({
  communityId,
  loading,
  error,
  programs,
  featured,
  others,
  activeStatus,
  searchValue,
  onSearchChange,
  onStatusChange,
  onClearFilters,
  onRetry,
}: ProgramsContentProps) {
  if (loading) return <ProgramsSkeleton />;
  if (error) return <ProgramsError onRetry={onRetry} />;

  const hasActiveFilters = activeStatus !== "all" || searchValue.trim().length > 0;
  if (programs.length === 0 && !hasActiveFilters) return <ProgramsEmpty />;

  return (
    <>
      {featured ? <FeaturedProgram program={featured} communityId={communityId} /> : null}
      <ProgramsToolbar
        activeStatus={activeStatus}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
      />
      {programs.length === 0 || others.length === 0 ? (
        <ProgramsFilteredEmpty onClearFilters={onClearFilters} />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {others.map((program, idx) => (
            <div
              key={program.programId}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
            >
              <EditorialProgramCard program={program} communityId={communityId} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

interface ToolbarProps {
  activeStatus: ProgramStatus | "all";
  searchValue: string;
  onSearchChange: (v: string) => void;
  onStatusChange: (key: ProgramStatus | "all") => void;
}

function ProgramsToolbar({
  activeStatus,
  searchValue,
  onSearchChange,
  onStatusChange,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="flex-1 text-xl md:text-2xl font-semibold tracking-[-0.02em] text-foreground">
        All programs
      </h2>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="program-search" className="sr-only">
          Search programs
        </label>
        <input
          id="program-search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search programs…"
          className="h-9 w-56 rounded-lg border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div
        role="tablist"
        aria-label="Filter programs by status"
        className="flex gap-0.5 rounded-lg bg-secondary p-[3px]"
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onStatusChange(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition",
                isActive
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FundingHeroSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading funding opportunities"
      className="relative overflow-hidden mb-10 md:mb-12"
    >
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/60 via-transparent to-transparent dark:from-brand-900/10"
      />
      <div className="grid gap-8 md:gap-12 md:grid-cols-[1.3fr_1fr]">
        <div className="animate-pulse">
          <div className="mb-3 inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500/40" />
            <div className="h-3 w-44 rounded-md bg-secondary" />
          </div>
          <div className="space-y-3">
            <div className="h-10 md:h-12 lg:h-[52px] w-[80%] rounded-lg bg-secondary" />
            <div className="h-10 md:h-12 lg:h-[52px] w-[55%] rounded-lg bg-secondary" />
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-4 w-[90%] max-w-prose rounded bg-secondary" />
            <div className="h-4 w-[60%] max-w-prose rounded bg-secondary" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border self-end animate-pulse">
          {SKELETON_KEYS.slice(0, 4).map((key) => (
            <div key={key} className="bg-background p-4 md:p-5">
              <div className="h-3 w-20 rounded bg-secondary" />
              <div className="mt-2 h-7 w-14 rounded bg-secondary" />
              <div className="mt-1.5 h-3 w-24 rounded bg-secondary" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgramsToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3 animate-pulse" aria-hidden>
      <div className="h-7 w-40 rounded bg-secondary flex-1" />
      <div className="h-9 w-56 rounded-lg bg-secondary" />
      <div className="h-9 w-64 rounded-lg bg-secondary" />
    </div>
  );
}

function FeaturedProgramSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-50/40 via-background to-background p-8 md:p-10 animate-pulse"
      aria-hidden
    >
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-secondary" />
            <div className="h-6 w-24 rounded-full bg-secondary" />
          </div>
          <div className="space-y-2">
            <div className="h-9 w-3/4 rounded-lg bg-secondary" />
            <div className="h-9 w-1/2 rounded-lg bg-secondary" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-[90%] rounded bg-secondary" />
            <div className="h-4 w-[70%] rounded bg-secondary" />
          </div>
          <div className="h-10 w-36 rounded-full bg-secondary" />
        </div>
        <div className="space-y-3 self-center">
          <div className="flex justify-between border-b border-border pb-3">
            <div className="h-4 w-20 rounded bg-secondary" />
            <div className="h-5 w-16 rounded bg-secondary" />
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <div className="h-4 w-20 rounded bg-secondary" />
            <div className="h-5 w-16 rounded bg-secondary" />
          </div>
          <div className="flex justify-between">
            <div className="h-4 w-20 rounded bg-secondary" />
            <div className="h-5 w-16 rounded bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgramsSkeleton() {
  return (
    <div data-testid="programs-loading" className="flex flex-col gap-6" aria-busy="true">
      <FeaturedProgramSkeleton />
      <ProgramsToolbarSkeleton />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {SKELETON_KEYS.map((key) => (
          <ProgramCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}

function ProgramsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border py-12 text-center">
      <AlertCircle className="mx-auto mb-2 h-12 w-12 text-destructive" />
      <h3 className="mb-1 text-lg font-semibold">Failed to load programs</h3>
      <p className="mb-4 text-muted-foreground">
        Something went wrong while loading programs. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mx-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}

function ProgramsEmpty() {
  return (
    <div className="flex h-max flex-1 items-center justify-center rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-16">
      <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
        <Image
          src="/images/comments.png"
          alt="No funding opportunities yet"
          width={438}
          height={185}
          className="object-cover"
          loading="lazy"
        />
        <div className="flex w-full flex-col items-center justify-center gap-3">
          <p className="text-center text-lg font-semibold text-black dark:text-zinc-100">
            No programs available
          </p>
          <p className="text-center text-base font-normal text-gray-600 dark:text-zinc-400">
            There are currently no funding programs in this community. Check back later for new
            opportunities.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgramsFilteredEmpty({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex h-max flex-1 items-center justify-center rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-16">
      <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
        <Image
          src="/images/comments.png"
          alt="No matching programs"
          width={438}
          height={185}
          className="object-cover"
          loading="lazy"
        />
        <div className="flex w-full flex-col items-center justify-center gap-3">
          <p className="text-center text-lg font-semibold text-black dark:text-zinc-100">
            No programs match your filters
          </p>
          <p className="text-center text-base font-normal text-gray-600 dark:text-zinc-400">
            Try a different status or search term to find more funding opportunities.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-2 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}
