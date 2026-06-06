"use client";

import pluralize from "pluralize";
import { useDonorReports } from "@/hooks/useDonorReports";
import { Link } from "@/src/components/navigation/Link";
import type { ResearchReportListItem } from "@/types/donor-research";
import { PAGES } from "@/utilities/pages";
import { StatusBadge } from "./StatusBadge";

/**
 * Past-reports list panel (U13b).
 *
 * Three-states honored:
 *  - loading: skeleton rows
 *  - empty: explicit CTA (no reports yet)
 *  - error: rendered inline (the parent route also has an error boundary)
 */
export function ReportListPanel() {
  const reportsQuery = useDonorReports({ limit: 25 });

  if (reportsQuery.isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold">Past reports</h2>
        </header>
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-muted" aria-hidden />
          ))}
        </div>
      </div>
    );
  }

  if (reportsQuery.isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold">Past reports</h2>
        </header>
        <p className="text-sm text-red-600">
          Couldn't load reports: {(reportsQuery.error as Error)?.message || "unknown error"}
        </p>
        <button
          type="button"
          onClick={() => reportsQuery.refetch()}
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  const reports = reportsQuery.data?.items ?? [];

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <h2 className="mb-1 text-lg font-semibold">No reports yet</h2>
        <p className="text-sm text-muted-foreground">
          Use the form above to start your first research report.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Past reports</h2>
        <span className="text-xs text-muted-foreground">
          {reports.length} {pluralize("report", reports.length)}
        </span>
      </header>
      <ul className="flex flex-col gap-2">
        {reports.map((report) => (
          <ReportRow key={report.id} report={report} />
        ))}
      </ul>
    </div>
  );
}

function ReportRow({ report }: { report: ResearchReportListItem }) {
  const createdAt = new Date(report.createdAt);
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
        href={PAGES.DONOR_RESEARCH.REPORT(report.id)}
        className="flex items-start justify-between gap-3 rounded-md border border-border p-3 hover:bg-muted/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={report.status} />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {report.mode === "deep" ? "Deep research" : "Fast research"}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {headline}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {report.donorHandleLabel ? (
              <>
                <span className="font-medium text-foreground/80">{report.donorHandleLabel}</span>
                <span aria-hidden> · </span>
              </>
            ) : null}
            Started {createdAt.toLocaleString()}
            {finishedAt ? ` · Finished ${new Date(finishedAt).toLocaleString()}` : ""}
          </p>
          {report.errorMessage ? (
            <p className="mt-0.5 truncate text-xs text-red-600">{report.errorMessage}</p>
          ) : null}
        </div>
        {report.hasShareToken ? (
          <span className="mt-0.5 shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
            Shared
          </span>
        ) : null}
      </Link>
    </li>
  );
}
