"use client";

import pluralize from "pluralize";
import { type ReactNode, useState } from "react";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { Link } from "@/src/components/navigation/Link";
import { NewDonorHandleModal } from "@/src/features/donor-research/components/criteria-input/NewDonorHandleModal";
import { useResearchTray } from "@/src/features/non-profits/hooks/use-research-tray";
import type { ResearchTrayEntry } from "@/src/features/non-profits/services/research-tray.service";
import type { DonorHandle, ResearchReportListItem } from "@/types/donor-research";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { EmptyState, ErrorState, type ModuleStatus, Section, SkeletonList } from "./primitives";
import { SoftIcon } from "./SoftIcon";
import {
  BTN_BASE,
  BTN_OUTLINE,
  BTN_PRIMARY,
  BTN_SM,
  badgeClasses,
  SK,
  THUMB_BASE,
} from "./soft-classes";
import { reportTitle, statusBadge, useAdvisorData } from "./useAdvisorData";

type AdvisorView = "reports" | "handles" | "saved";

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${pluralize("minute", minutes)} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${pluralize("hour", hours)} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${pluralize("day", days)} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${pluralize("month", months)} ago`;
  return `${Math.floor(months / 12)} ${pluralize("year", Math.floor(months / 12))} ago`;
}

/* ── full drill-in view ───────────────────────────────────────── */

/** Soft card grid of research reports. */
function ReportsGrid({ reports }: { reports: ResearchReportListItem[] }) {
  return (
    <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(264px,1fr))]">
      {reports.map((r) => {
        const b = statusBadge(r.status);
        const updated = timeAgo(r.completedAt ?? r.fastCompletedAt ?? r.createdAt);
        return (
          <Link
            className="flex flex-col gap-3 rounded-sf-tile border border-sf-line bg-sf-elev p-4 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-[3px] hover:border-sf-line-strong hover:bg-sf-card hover:shadow-[var(--sf-shadow-card)]"
            href={PAGES.DONOR_RESEARCH.REPORT(r.id)}
            key={r.id}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={badgeClasses("gray")}>{r.mode === "deep" ? "Deep" : "Fast"}</span>
              <span className={badgeClasses(b.tone)}>
                <SoftIcon name={b.icon} className="h-3 w-3" />
                {b.label}
              </span>
            </div>
            <div className="text-[15px] font-[650] tracking-[-0.01em] text-sf-heading">
              {reportTitle(r)}
            </div>
            {updated ? <div className="text-[12.5px] text-sf-muted">Updated {updated}</div> : null}
          </Link>
        );
      })}
    </div>
  );
}

/** A single "Your work" rail entry — a route link or an in-dashboard action. */
function RailItem({
  icon,
  label,
  count,
  active,
  href,
  onClick,
}: {
  icon: string;
  label: string;
  count?: number;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  // `text-sf-card` (not literal white) so the label stays readable in dark mode,
  // where `--sf-ink` inverts to a near-white and `--sf-card` inverts to dark.
  const className = cn(
    "flex items-center gap-[11px] rounded-[12px] px-[11px] py-2.5 text-[14px] font-[550] transition-colors",
    active ? "bg-sf-ink text-sf-card" : "text-sf-ink hover:bg-sf-chip"
  );
  const inner = (
    <>
      <SoftIcon name={icon} className="h-[18px] w-[18px] flex-none opacity-90" />
      <span className="flex-1 truncate">{label}</span>
      {count != null ? (
        <span
          className={cn(
            "ml-auto rounded-full px-[9px] py-px text-[12px] font-[650]",
            active ? "bg-sf-card/[.16] text-sf-card" : "bg-sf-chip text-sf-muted"
          )}
        >
          {count}
        </span>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link className={className} href={href}>
        {inner}
      </Link>
    );
  }
  return (
    <button className={cn(className, "w-full text-left")} onClick={onClick} type="button">
      {inner}
    </button>
  );
}

/** Design's "Your work" left rail — in-page tabs, real counts. */
function LeftRail({
  active,
  onSelect,
  reportCount,
  savedCount,
  handleCount,
}: {
  active: AdvisorView;
  onSelect: (view: AdvisorView) => void;
  reportCount: number;
  savedCount: number;
  handleCount: number;
}) {
  return (
    <aside className="flex flex-col gap-[3px] self-start rounded-sf-card border border-sf-line bg-sf-card p-3 shadow-[var(--sf-shadow-card)] lg:sticky lg:top-5">
      <div className="mt-1 px-[10px] pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.07em] text-sf-muted">
        Your work
      </div>
      <RailItem
        active={active === "reports"}
        count={reportCount}
        icon="compass"
        label="Research reports"
        onClick={() => onSelect("reports")}
      />
      <RailItem
        active={active === "handles"}
        count={handleCount}
        icon="users"
        label="Donor handles"
        onClick={() => onSelect("handles")}
      />
      <RailItem
        active={active === "saved"}
        count={savedCount}
        icon="bookmark"
        label="Saved nonprofits"
        onClick={() => onSelect("saved")}
      />
    </aside>
  );
}

function ReportCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-sf-tile border border-sf-line bg-sf-elev p-4">
      <div className="flex justify-between">
        <span className={cn(SK, "h-[22px] w-16 !rounded-full")} />
        <span className={cn(SK, "h-[22px] w-16 !rounded-full")} />
      </div>
      <span className={cn(SK, "h-[15px] w-[75%]")} />
      <span className={cn(SK, "h-[11px] w-[45%]")} />
    </div>
  );
}

/** "New report" — redirects to the full /nonprofit-research builder. */
function NewReportButton() {
  return (
    <Link className={cn(BTN_BASE, BTN_SM, BTN_PRIMARY)} href={PAGES.DONOR_RESEARCH.INDEX}>
      <SoftIcon name="plus" className="h-4 w-4" />
      New report
    </Link>
  );
}

/** "Research reports" tab — the full grid, with states + a New-report CTA. */
function ReportsView({
  reports,
  status,
  onRetry,
}: {
  reports: ResearchReportListItem[];
  status: ModuleStatus;
  onRetry: () => void;
}) {
  let body: ReactNode;
  if (status === "error") {
    body = <ErrorState message="Unable to load your research reports." onRetry={onRetry} />;
  } else if (status === "loading") {
    body = (
      <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(264px,1fr))]">
        <ReportCardSkeleton />
        <ReportCardSkeleton />
        <ReportCardSkeleton />
      </div>
    );
  } else if (reports.length === 0) {
    body = (
      <EmptyState
        brand
        body="Ask an agent to find foundations and grantmaking nonprofits aligned to a mission — every answer cited to a 990 filing."
        icon="compass"
        primary={{ label: "New research report", icon: "search", href: PAGES.DONOR_RESEARCH.INDEX }}
        title="No research reports yet"
      />
    );
  } else {
    body = <ReportsGrid reports={reports} />;
  }

  return (
    <Section
      action={<NewReportButton />}
      icon="compass"
      id="reports"
      soft
      sub="Every report you've generated"
      title="Research reports"
    >
      {body}
    </Section>
  );
}

function bookmarkHref(entry: ResearchTrayEntry): string {
  switch (entry.entityType) {
    case "foundation":
      return NON_PROFITS_PAGES.FOUNDATION(entry.entityId);
    case "nonprofit":
      return NON_PROFITS_PAGES.NONPROFIT(entry.entityId);
    case "grant":
      return NON_PROFITS_PAGES.GRANT(entry.entityId);
    default:
      return NON_PROFITS_PAGES.HOME;
  }
}

/** "Saved nonprofits" tab — the research-tray bookmarks. */
function SavedView({
  entries,
  isLoading,
  isError,
  onRetry,
}: {
  entries: ResearchTrayEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  let body: ReactNode;
  if (isError) {
    body = <ErrorState message="Unable to load your saved nonprofits." onRetry={onRetry} />;
  } else if (isLoading) {
    body = <SkeletonList count={4} />;
  } else if (entries.length === 0) {
    body = (
      <EmptyState
        body="Bookmark foundations and nonprofits while researching in Find Funders to build a prospect list."
        icon="bookmark"
        secondary={{ label: "Browse Find Funders", icon: "compass", href: NON_PROFITS_PAGES.HOME }}
        title="No saved nonprofits yet"
      />
    );
  } else {
    body = (
      <div className="flex flex-col overflow-hidden rounded-sf-tile border border-sf-line bg-sf-card">
        {entries.map((entry) => (
          <Link
            className="flex items-center gap-[14px] px-4 py-[15px] transition-colors hover:bg-sf-elev [&+&]:border-t [&+&]:border-sf-line"
            href={bookmarkHref(entry)}
            key={entry.id}
          >
            <div className={cn(THUMB_BASE, "h-9 w-9 rounded-[9px]")}>
              <SoftIcon name="bookmark" className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-[600] text-sf-heading">
                {entry.name || "Untitled"}
              </div>
              <div className="truncate text-[12px] capitalize text-sf-muted">
                {entry.entityType}
              </div>
            </div>
            <SoftIcon name="arrow" className="h-4 w-4 flex-none text-sf-muted" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <Section
      action={
        <Link className={cn(BTN_BASE, BTN_SM, BTN_OUTLINE)} href={NON_PROFITS_PAGES.HOME}>
          <SoftIcon name="compass" className="h-4 w-4" />
          Find funders
        </Link>
      }
      icon="bookmark"
      id="saved"
      soft
      sub="Bookmarked from your Find Funders research"
      title="Saved nonprofits"
    >
      {body}
    </Section>
  );
}

/** Soft "New handle" trigger — opens the create-handle modal. */
function NewHandleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className={cn(BTN_BASE, BTN_SM, BTN_OUTLINE, "!shadow-none")}
      onClick={onClick}
      type="button"
    >
      <SoftIcon name="plus" className="h-4 w-4" />
      New handle
    </button>
  );
}

/** "Donor handles" tab — create a handle, or click one to edit its persona. */
function HandlesView({
  handles,
  isLoading,
  isError,
  onRetry,
}: {
  handles: DonorHandle[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editHandle, setEditHandle] = useState<DonorHandle | null>(null);

  const closeModal = () => {
    setCreateOpen(false);
    setEditHandle(null);
  };

  let body: ReactNode;
  if (isError) {
    body = <ErrorState message="Unable to load your donor handles." onRetry={onRetry} />;
  } else if (isLoading) {
    body = <SkeletonList count={3} />;
  } else if (handles.length === 0) {
    body = (
      <EmptyState
        action={<NewHandleButton onClick={() => setCreateOpen(true)} />}
        body="Donor handles are anonymous labels you use to track research for each donor."
        icon="users"
        title="No donor handles yet"
      />
    );
  } else {
    body = (
      <div className="flex flex-col overflow-hidden rounded-sf-tile border border-sf-line bg-sf-card">
        {handles.map((handle) => (
          <button
            className="flex items-center gap-[14px] px-4 py-[15px] text-left transition-colors hover:bg-sf-elev [&+&]:border-t [&+&]:border-sf-line"
            key={handle.id}
            onClick={() => setEditHandle(handle)}
            type="button"
          >
            <div className={cn(THUMB_BASE, "h-9 w-9 rounded-[9px]")}>
              <SoftIcon name="users" className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-[600] text-sf-heading">
                {handle.opaqueLabel}
              </div>
              <div className="truncate text-[12px] text-sf-muted">
                {handle.notes || `Added ${timeAgo(handle.createdAt)}`}
              </div>
            </div>
            <SoftIcon name="arrow" className="h-4 w-4 flex-none text-sf-muted" />
          </button>
        ))}
      </div>
    );
  }

  const action =
    !isLoading && !isError && handles.length > 0 ? (
      <NewHandleButton onClick={() => setCreateOpen(true)} />
    ) : null;

  return (
    <Section
      action={action}
      icon="users"
      id="handles"
      soft
      sub="Anonymous labels you research donors under"
      title="Donor handles"
    >
      {body}
      <NewDonorHandleModal
        editHandle={editHandle}
        onCreated={() => {
          closeModal();
          onRetry();
        }}
        onOpenChange={(next) => {
          if (!next) closeModal();
        }}
        open={createOpen || editHandle !== null}
      />
    </Section>
  );
}

/**
 * The advisor drill-in: a "Your work" rail whose items switch the main column in
 * place — all research reports, donor handles, or saved nonprofits. Creating a
 * report redirects to the full /nonprofit-research builder. Only mounts for
 * confirmed advisors (the bento tile).
 */
export function AdvisorFullView({ authenticated }: { authenticated: boolean }) {
  const [view, setView] = useState<AdvisorView>("reports");
  const { status, reports, onRetry } = useAdvisorData(authenticated);
  const handlesQuery = useDonorHandles();
  const savedQuery = useResearchTray();

  const handles = handlesQuery.data?.items ?? [];
  const saved = savedQuery.data ?? [];

  return (
    <div className="grid gap-[26px] lg:[grid-template-columns:234px_minmax(0,1fr)]">
      <LeftRail
        active={view}
        handleCount={handles.length}
        onSelect={setView}
        reportCount={reports.length}
        savedCount={saved.length}
      />
      <div className="flex min-w-0 flex-col gap-[18px]">
        {view === "reports" ? (
          <ReportsView onRetry={onRetry} reports={reports} status={status} />
        ) : null}
        {view === "handles" ? (
          <HandlesView
            handles={handles}
            isError={handlesQuery.isError}
            isLoading={handlesQuery.isLoading}
            onRetry={() => handlesQuery.refetch()}
          />
        ) : null}
        {view === "saved" ? (
          <SavedView
            entries={saved}
            isError={savedQuery.isError}
            isLoading={savedQuery.isLoading}
            onRetry={() => savedQuery.refetch()}
          />
        ) : null}
      </div>
    </div>
  );
}
