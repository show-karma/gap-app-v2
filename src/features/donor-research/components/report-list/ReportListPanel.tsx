"use client";

import { FileText, Share2, UserRound } from "lucide-react";
import { memo, type ReactNode, useState } from "react";
import { EmptyState, ErrorState, SkeletonList } from "@/components/Pages/Dashboard/v3/primitives";
import { SoftIcon } from "@/components/Pages/Dashboard/v3/SoftIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useDonorReports } from "@/hooks/useDonorReports";
import type { ReportListStatusFilter } from "@/services/donor-research.service";
import { Link } from "@/src/components/navigation/Link";
import type { ResearchReportListItem } from "@/types/donor-research";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { PAGES } from "@/utilities/pages";
import { StatusBadge } from "./StatusBadge";

/**
 * Past-reports list panel (U13b, restyled per redesign spec 2.3).
 *
 * Three-states honored:
 *  - loading: skeleton rows
 *  - empty: explicit CTA (no reports yet), distinct copy when filtered
 *  - error: rendered inline with retry (the parent route also has an error
 *    boundary for unrecoverable failures)
 */
const ALL_DONORS = "__all__";
const ALL_STATUSES = "__all_statuses__";

const REPORT_STATUS_OPTIONS: ReadonlyArray<{
  value: ReportListStatusFilter;
  label: string;
}> = [
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "failed", label: "Failed" },
];

type StatusFilter = ReportListStatusFilter | typeof ALL_STATUSES;

function isReportStatusFilter(value: string): value is ReportListStatusFilter {
  return REPORT_STATUS_OPTIONS.some((option) => option.value === value);
}

interface ReportListBodyProps {
  reportsQuery: ReturnType<typeof useDonorReports>;
  isFiltered: boolean;
  onClearFilters: () => void;
}

/** Picks the loading / error / empty / success body for the list — split out
 * of `ReportListPanel` to keep that component's branching under the lint
 * complexity budget. */
function ReportListBody({
  reportsQuery,
  isFiltered,
  onClearFilters,
}: ReportListBodyProps): ReactNode {
  if (reportsQuery.isLoading) {
    return <SkeletonList count={4} />;
  }

  if (reportsQuery.isError) {
    return (
      <ErrorState
        message={(reportsQuery.error as Error)?.message || "Couldn't load your reports. Try again."}
        onRetry={() => reportsQuery.refetch()}
      />
    );
  }

  const reports = reportsQuery.data?.items ?? [];
  if (reports.length === 0) {
    return (
      <EmptyState
        brand
        body={
          isFiltered
            ? "No reports match the selected filters."
            : "Describe what you're researching and we'll return ranked nonprofit recommendations."
        }
        icon="compass"
        primary={{ label: "New report", icon: "plus", href: PAGES.DONOR_RESEARCH.NEW }}
        secondary={isFiltered ? { label: "Clear filters", onClick: onClearFilters } : undefined}
        title={isFiltered ? "No matching reports" : "No reports yet"}
      />
    );
  }

  return (
    <ul className="grid gap-2.5">
      {reports.map((report) => (
        <ReportRow key={report.id} report={report} />
      ))}
    </ul>
  );
}

export function ReportListPanel() {
  const [donorFilter, setDonorFilter] = useState<string>(ALL_DONORS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES);
  const reportsQuery = useDonorReports({
    limit: 25,
    donorHandleId: donorFilter === ALL_DONORS ? undefined : donorFilter,
    status: statusFilter === ALL_STATUSES ? undefined : statusFilter,
  });
  const handlesQuery = useDonorHandles({ limit: 100 });

  const handles = handlesQuery.data?.items ?? [];
  const isFiltered = donorFilter !== ALL_DONORS || statusFilter !== ALL_STATUSES;

  const clearFilters = () => {
    setDonorFilter(ALL_DONORS);
    setStatusFilter(ALL_STATUSES);
  };

  return (
    <section className="flex flex-col gap-4">
      <PanelHeader
        donorFilter={donorFilter}
        handles={handles}
        onChangeDonor={setDonorFilter}
        onChangeStatus={(value) =>
          setStatusFilter(isReportStatusFilter(value) ? value : ALL_STATUSES)
        }
        statusFilter={statusFilter}
      />
      <ReportListBody
        isFiltered={isFiltered}
        onClearFilters={clearFilters}
        reportsQuery={reportsQuery}
      />
    </section>
  );
}

interface PanelHeaderProps {
  handles: ReadonlyArray<{ id: string; opaqueLabel: string }>;
  donorFilter: string;
  onChangeDonor: (next: string) => void;
  statusFilter: StatusFilter;
  onChangeStatus: (next: string) => void;
}

function PanelHeader({
  handles,
  donorFilter,
  onChangeDonor,
  statusFilter,
  onChangeStatus,
}: PanelHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="m-0 text-[15px] font-[650] tracking-[-0.01em] text-sf-heading">All reports</h2>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <DonorFilterSelect handles={handles} onChange={onChangeDonor} value={donorFilter} />
        <StatusFilterSelect onChange={onChangeStatus} value={statusFilter} />
      </div>
    </div>
  );
}

function StatusFilterSelect({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (next: string) => void;
}) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div className="flex items-center gap-2 text-[12px] text-sf-muted" ref={setPortalContainer}>
      <span className="font-medium uppercase tracking-[0.1em]">Status</span>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger
          aria-label="Filter reports by status"
          className="h-8 min-w-[9.5rem] rounded-full border-sf-line-strong bg-sf-card text-[12.5px] text-sf-heading"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="rounded-xl border-sf-line bg-sf-card text-sf-heading shadow-sf-card"
          container={portalContainer}
        >
          <SelectItem className="rounded-md text-[13px] focus:bg-sf-elev" value={ALL_STATUSES}>
            All statuses
          </SelectItem>
          {REPORT_STATUS_OPTIONS.map((option) => (
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
    </div>
  );
}

interface DonorFilterSelectProps {
  handles: ReadonlyArray<{ id: string; opaqueLabel: string }>;
  value: string;
  onChange: (next: string) => void;
}

function DonorFilterSelect({ handles, value, onChange }: DonorFilterSelectProps) {
  const disabled = handles.length === 0;
  // Anchors the Select's portal inside the .dashv3-themed subtree — the
  // default portal target (document.body) sits outside it, so the --sf-*
  // CSS variables the popover relies on would otherwise resolve to nothing.
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div className="flex items-center gap-2 text-[12px] text-sf-muted" ref={setPortalContainer}>
      <span className="font-medium uppercase tracking-[0.1em]">Persona</span>
      <Select disabled={disabled} onValueChange={onChange} value={value}>
        <SelectTrigger
          aria-label="Filter reports by persona"
          className="h-8 max-w-[14rem] rounded-full border-sf-line-strong bg-sf-card text-[12.5px] text-sf-heading"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="rounded-xl border-sf-line bg-sf-card text-sf-heading shadow-sf-card"
          container={portalContainer}
        >
          <SelectItem className="rounded-md text-[13px] focus:bg-sf-elev" value={ALL_DONORS}>
            All personas
          </SelectItem>
          {handles.map((h) => (
            <SelectItem className="rounded-md text-[13px] focus:bg-sf-elev" key={h.id} value={h.id}>
              {h.opaqueLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const ReportRow = memo(function ReportRow({ report }: { report: ResearchReportListItem }) {
  const finishedAt = report.completedAt ?? report.fastCompletedAt ?? null;
  // Headline the criteria text (truncated server-side) when present;
  // fall back to the mode label so unbackfilled rows still render
  // something readable.
  const headline =
    report.criteriaSummary && report.criteriaSummary.length > 0
      ? report.criteriaSummary
      : `${report.mode === "deep" ? "Deep" : "Fast"} report`;
  return (
    <li>
      <Link
        className="group grid min-h-[88px] grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-4 rounded-sf-tile border border-sf-line bg-sf-card px-4 py-3.5 transition-[background-color,border-color] hover:border-sf-line-strong hover:bg-sf-elev"
        href={PAGES.DONOR_RESEARCH.REPORT(report.id)}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-sf-chip text-sf-muted transition-colors group-hover:text-sf-heading">
          <FileText aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-[650] text-sf-heading">{headline}</p>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-sf-muted">
            <span className="sm:hidden">
              <StatusBadge status={report.status} />
            </span>
            <span aria-hidden className="sm:hidden">
              ·
            </span>
            {report.donorHandleLabel ? (
              <>
                <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-sf-ink-soft">
                  <UserRound aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{report.donorHandleLabel}</span>
                </span>
                <span aria-hidden> · </span>
              </>
            ) : null}
            <span>
              {finishedAt ? "Finished" : "Started"}{" "}
              {renderRelativeTime(finishedAt ?? report.createdAt)}
            </span>
            {report.hasShareToken ? (
              <span className="inline-flex items-center gap-1 text-brand-emphasis dark:text-brand-subtle">
                <Share2 aria-hidden="true" className="h-3.5 w-3.5" /> Shared
              </span>
            ) : null}
          </div>
          {report.errorMessage ? (
            <p className="mt-0.5 truncate text-[12px] text-red-600 dark:text-red-400">
              {report.errorMessage}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex">
            <StatusBadge status={report.status} />
          </span>
          <SoftIcon
            className="h-4 w-4 flex-none text-sf-muted transition-transform group-hover:translate-x-0.5 group-hover:text-sf-heading"
            name="arrow"
          />
        </div>
      </Link>
    </li>
  );
});

ReportRow.displayName = "ReportRow";
