"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { getProjectTitle } from "@/components/FundingPlatform/helper/getProjectTitle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEnrichedApplications } from "@/features/user-applications/hooks/use-enriched-applications";
import type {
  UserApplicationsFilters,
  UseUserApplicationsReturn,
} from "@/features/user-applications/types";
import { Link } from "@/src/components/navigation/Link";
import { ApplicationLookupModal } from "@/src/features/application-lookup/components/ApplicationLookupModal";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import {
  type BadgeTone,
  EmptyState,
  ErrorState,
  Section,
  SkeletonList,
  StatTiles,
} from "./primitives";
import { SoftIcon } from "./SoftIcon";
import { BTN_BASE, BTN_OUTLINE, BTN_SM, badgeClasses, SK, THUMB_BASE } from "./soft-classes";
import { getApplicationBadge } from "./summaries";

interface ApplicationsFullViewProps {
  communitySlug?: string;
  applicationsHook: UseUserApplicationsReturn;
}

/** Decorative status icon — in-progress states get a clock, approved a check. */
function badgeIcon(tone: BadgeTone): string | undefined {
  if (tone === "green") return "check";
  if (tone === "blue" || tone === "amber") return "clock";
  return undefined;
}

function StatTilesSkeleton() {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(148px,1fr))]">
      {["a", "b", "c"].map((k) => (
        <div className="rounded-sf-tile border border-sf-line bg-sf-elev p-[18px]" key={k}>
          <span className={cn(SK, "block h-8 w-12")} />
          <span className={cn(SK, "mt-3 block h-3 w-24")} />
        </div>
      ))}
    </div>
  );
}

const STATUS_OPTIONS: Array<{ value: ApplicationStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "resubmitted", label: "Resubmitted" },
  { value: "under_review", label: "Under review" },
  { value: "revision_requested", label: "Revision requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function hasActiveFilters(filters: UserApplicationsFilters): boolean {
  return (
    (filters.status ?? "all") !== "all" ||
    !!filters.programId ||
    !!filters.searchQuery ||
    !!filters.dateRange
  );
}

const FIELD_CLASS =
  "h-10 w-full rounded-full border border-sf-line bg-sf-elev text-[13px] text-sf-heading focus:border-sf-line-strong focus:outline-none";

/** Soft search + status filter bar (debounced search, driven by the store filters). */
function ApplicationsFilterBar({
  filters,
  onChange,
  onReset,
}: {
  filters: UserApplicationsFilters;
  onChange: (next: Partial<UserApplicationsFilters>) => void;
  onReset: () => void;
}) {
  const [search, setSearch] = useState(filters.searchQuery ?? "");
  // Anchors the Select's portal inside the .dashv3-themed subtree — the
  // default portal target (document.body) sits outside it, so the --sf-*
  // CSS variables the popover relies on (bg-sf-card, border-sf-line, …)
  // would otherwise resolve to nothing and render an unstyled, see-through box.
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  // Debounce typing into the store filter so we don't refetch on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (filters.searchQuery ?? "")) onChange({ searchQuery: search });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filters.searchQuery, onChange]);

  // Keep the input in sync when the filter is cleared/changed externally.
  useEffect(() => {
    setSearch(filters.searchQuery ?? "");
  }, [filters.searchQuery]);

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row" ref={setPortalContainer}>
      <div className="relative flex-1 sm:max-w-xs">
        <SoftIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sf-muted"
          name="search"
        />
        <input
          aria-label="Search applications"
          className={cn(FIELD_CLASS, "pl-9 pr-9 placeholder:text-sf-muted")}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search applications..."
          type="text"
          value={search}
        />
        {search ? (
          <button
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sf-muted hover:text-sf-heading"
            onClick={() => {
              setSearch("");
              onChange({ searchQuery: "" });
            }}
            type="button"
          >
            <SoftIcon className="h-4 w-4" name="close" />
          </button>
        ) : null}
      </div>

      <Select
        onValueChange={(value) => onChange({ status: value as ApplicationStatus | "all" })}
        value={filters.status ?? "all"}
      >
        <SelectTrigger
          aria-label="Filter by status"
          className="h-10 w-full gap-2 rounded-full border-sf-line bg-sf-elev px-4 text-[13px] text-sf-heading shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-0 data-[state=open]:border-sf-line-strong sm:w-[190px]"
        >
          {/* `!flex`: SelectTrigger's base classes include `[&>span]:line-clamp-1`,
              meant for a bare <SelectValue> child. Since this wrapper span is
              itself that direct child, line-clamp's `display` wins over `flex`
              on specificity alone (icon/text collapse into separate lines) —
              `!flex` forces it back. */}
          <span className="!flex min-w-0 items-center gap-2">
            <SoftIcon className="h-4 w-4 flex-none text-sf-muted" name="filter" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent
          className="rounded-xl border-sf-line bg-sf-card text-sf-heading shadow-[var(--sf-shadow-card)]"
          container={portalContainer}
        >
          {STATUS_OPTIONS.map((option) => (
            <SelectItem
              className="rounded-md text-[13px] focus:bg-sf-elev"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters(filters) ? (
        <button
          className={cn(BTN_BASE, BTN_SM, BTN_OUTLINE, "!shadow-none")}
          onClick={onReset}
          type="button"
        >
          <SoftIcon className="h-4 w-4" name="close" />
          Clear
        </button>
      ) : null}
    </div>
  );
}

/** Soft empty row shown when active filters match no applications. */
function NoFilterMatch() {
  return (
    <div className="flex flex-col items-center gap-1 rounded-sf-tile border-[1.5px] border-dashed border-sf-line-strong bg-sf-elev px-6 py-11 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-[15px] bg-sf-chip">
        <SoftIcon className="h-[22px] w-[22px] text-sf-muted" name="search" />
      </div>
      <h3 className="m-0 text-base font-bold text-sf-heading">
        No applications match your filters
      </h3>
      <p className="m-0 mt-1 text-[13px] text-sf-muted">
        Try adjusting your search or status filter.
      </p>
    </div>
  );
}

const ROW_CLASS =
  "flex items-center gap-[14px] px-4 py-[15px] transition-colors [&+&]:border-t [&+&]:border-sf-line";

/** One application row — project name + app id headline, program/community/date subline, status badge. */
const ApplicationRow = memo(function ApplicationRow({
  app,
  communitySlug,
}: {
  app: Application;
  communitySlug?: string;
}) {
  const badge = getApplicationBadge(app.status);
  const icon = badgeIcon(badge.tone);
  const communityLabel = app.communityName || app.communitySlug;
  // getProjectTitle scrapes any "name"/"title" field from the form data, so with
  // no real project title it can surface the community/org name. Only accept it
  // as a title when it's neither the reference number nor a community label;
  // otherwise headline the APP id itself (and drop the duplicate id token). The
  // community name still shows in the subline.
  const resolvedName = getProjectTitle(app);
  const communityAliases = [app.communityName, app.communitySlug].map((value) =>
    value?.toLowerCase()
  );
  const hasProjectTitle =
    !!resolvedName &&
    resolvedName !== app.referenceNumber &&
    !communityAliases.includes(resolvedName.toLowerCase());
  const title = hasProjectTitle ? resolvedName : app.referenceNumber;
  const sub = [
    app.programTitle && app.programTitle !== title ? app.programTitle : null,
    communityLabel,
    formatDate(app.createdAt),
  ]
    .filter(Boolean)
    .join(" · ");
  const effectiveCommunityId = communitySlug ?? app.communitySlug;
  const href = effectiveCommunityId
    ? PAGES.COMMUNITY.APPLICATION_DETAIL(effectiveCommunityId, app.referenceNumber)
    : undefined;

  const inner = (
    <>
      <div className={cn(THUMB_BASE, "h-9 w-9 rounded-[9px]")}>
        <SoftIcon name="file" className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13.5px] font-[600] text-sf-heading">{title}</span>
          {hasProjectTitle ? (
            <span className="flex-none font-mono text-[11px] text-sf-muted">
              {app.referenceNumber}
            </span>
          ) : null}
        </div>
        {sub ? <div className="truncate text-[12px] text-sf-muted">{sub}</div> : null}
      </div>
      <span className={badgeClasses(badge.tone)}>
        {icon ? <SoftIcon name={icon} className="h-3 w-3" /> : null}
        {badge.label}
      </span>
    </>
  );

  return href ? (
    <Link className={cn(ROW_CLASS, "hover:bg-sf-elev")} href={href}>
      {inner}
    </Link>
  ) : (
    <div className={ROW_CLASS}>{inner}</div>
  );
});

/** Prev / Next pager. Rendered only when there is more than one page. */
function ApplicationsPager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className={cn(BTN_BASE, BTN_SM, BTN_OUTLINE, "disabled:opacity-50")}
        disabled={page <= 1}
        onClick={() => onPage(Math.max(1, page - 1))}
        type="button"
      >
        Previous
      </button>
      <span className="text-[13px] text-sf-muted">
        Page {page} of {totalPages}
      </span>
      <button
        className={cn(BTN_BASE, BTN_SM, BTN_OUTLINE, "disabled:opacity-50")}
        disabled={page >= totalPages}
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        type="button"
      >
        Next
      </button>
    </div>
  );
}

/**
 * Applicant drill-in — the design's "My applications" view. A soft stat-tile
 * header over the applicant's status counts, followed by a compact list of
 * applications (each linking to its community detail page). Renders loading,
 * empty, error, and ready states.
 *
 * When the dashboard is not community-scoped, per-application community info is
 * resolved from each application's funding-program config so cross-community
 * rows still show a community name and link correctly.
 */
export function ApplicationsFullView({
  communitySlug,
  applicationsHook,
}: ApplicationsFullViewProps) {
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  const {
    applications,
    filters,
    pagination,
    statusCounts,
    isLoading,
    error,
    setFilters,
    setPage,
    refresh,
  } = applicationsHook;

  const resetFilters = () =>
    setFilters({ status: "all", programId: undefined, searchQuery: "", dateRange: undefined });

  // Without a scoped community, resolve each application's community from its
  // funding-program config so rows can display a name and build a detail link.
  const enrichedApplications = useEnrichedApplications(applications, communitySlug);

  const stats = useMemo(() => {
    const counts = statusCounts ?? {};
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const pending = (counts.pending ?? 0) + (counts.resubmitted ?? 0);
    const approved = counts.approved ?? 0;
    return { total, pending, approved };
  }, [statusCounts]);

  const filtersActive = hasActiveFilters(filters);
  const hasApplications = stats.total > 0;
  // The true "get started" empty state — no applications AND no filters applied.
  // A filter that matches nothing is a different state (handled in the list).
  const showTrueEmpty = !hasApplications && !filtersActive && !isLoading && !error;
  // Keep the filter bar visible whenever the user has data to filter or a filter
  // is already applied (so a filter that empties the list can still be cleared).
  const showFilterBar = !error && !showTrueEmpty && (hasApplications || filtersActive);

  let body: React.ReactNode;
  if (error) {
    body = (
      <ErrorState
        message="We could not fetch your applications. We've been notified."
        onRetry={() => refresh()}
      />
    );
  } else if (isLoading) {
    body = (
      <>
        <StatTilesSkeleton />
        <SkeletonList count={3} />
      </>
    );
  } else if (showTrueEmpty) {
    body = (
      <EmptyState
        icon="file"
        title="No applications yet"
        body="Browse funding programs to find opportunities and submit your first application."
        primary={{ label: "Explore programs", icon: "bank", href: PAGES.REGISTRY.ROOT }}
        subtleLink={
          communitySlug
            ? {
                label: "Can't find your application? Look it up",
                onClick: () => setIsLookupOpen(true),
              }
            : undefined
        }
      />
    );
  } else if (enrichedApplications.length === 0) {
    body = <NoFilterMatch />;
  } else {
    body = (
      <>
        {/* Status counts reflect the active filter, so the tiles (which read as a
            global overview) only make sense with no filter applied. */}
        {hasApplications && !filtersActive ? (
          <StatTiles
            items={[
              { n: stats.total, l: "Total applications" },
              { n: stats.pending, l: "Pending", tone: "amber" },
              { n: stats.approved, l: "Approved", tone: "green" },
            ]}
          />
        ) : null}
        <div className="flex flex-col overflow-hidden rounded-sf-tile border border-sf-line bg-sf-card">
          {enrichedApplications.map((app) => (
            <ApplicationRow app={app} communitySlug={communitySlug} key={app.id} />
          ))}
        </div>
        {pagination.totalPages > 1 ? (
          <ApplicationsPager
            onPage={setPage}
            page={pagination.page}
            totalPages={pagination.totalPages}
          />
        ) : null}
      </>
    );
  }

  return (
    <Section
      icon="file"
      id="applications"
      sub="Track and manage your funding applications"
      title="My applications"
    >
      {showFilterBar ? (
        <ApplicationsFilterBar filters={filters} onChange={setFilters} onReset={resetFilters} />
      ) : null}
      {body}
      {communitySlug ? (
        <ApplicationLookupModal
          communitySlug={communitySlug}
          isOpen={isLookupOpen}
          onClose={() => setIsLookupOpen(false)}
        />
      ) : null}
    </Section>
  );
}
