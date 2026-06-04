"use client";

import pluralize from "pluralize";
import { useDonorReportStream } from "@/hooks/useDonorReportStream";
import { useDonorReport } from "@/hooks/useDonorReports";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { DonorResearchLoading } from "../common/DonorResearchLoading";
import { StatusBadge } from "../report-list/StatusBadge";
import { CandidateCard } from "./CandidateCard";
import { ProgressTimeline } from "./ProgressTimeline";
import { ShareTokenControls } from "./ShareTokenControls";

interface ReportViewerProps {
  reportId: string;
}

/**
 * Report viewer (U13c).
 *
 * Composes:
 *  - `ProgressTimeline` (SSE event stream while pipeline running)
 *  - Top-3 one-pager pane + full ranked list below
 *  - Share-token controls (U13d) when the report has reached a renderable
 *    state (`fast_complete` or later)
 *
 * Two-pane layout collapses to stacked tabs at narrow viewports via
 * responsive grid classes.
 */
export function ReportViewer({ reportId }: ReportViewerProps) {
  const reportQuery = useDonorReport(reportId);
  const stream = useDonorReportStream(reportId);

  if (reportQuery.isLoading) {
    return <DonorResearchLoading label="Loading report…" />;
  }

  if (reportQuery.isError) {
    throw reportQuery.error;
  }

  const report = reportQuery.data!;
  const candidates = report.candidates ?? [];
  const topThree = candidates.filter((c) => c.topThreeFlag);
  const remaining = candidates.filter((c) => !c.topThreeFlag);
  const isTerminal =
    report.status === "complete" || report.status === "fast_complete" || report.status === "failed";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link
              href={PAGES.DONOR_RESEARCH.INDEX}
              className="underline underline-offset-2 hover:text-foreground"
            >
              ← Back to donor research
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold capitalize">{report.mode} report</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={report.status} />
            <span className="text-xs text-muted-foreground">
              {candidates.length} {pluralize("candidate", candidates.length)}
            </span>
          </div>
        </div>
        {isTerminal ? (
          <ShareTokenControls
            reportId={reportId}
            hasShareToken={report.hasShareToken}
            shareTokenExpiresAt={report.shareTokenExpiresAt}
          />
        ) : null}
      </header>

      {!isTerminal ? (
        <section className="mb-6">
          <ProgressTimeline
            events={stream.events}
            latest={stream.latest}
            errorCount={stream.errorCount}
          />
        </section>
      ) : null}

      {report.errorMessage ? (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <strong className="block">Report failed</strong>
          {report.errorMessage}
        </div>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Top recommendations</h2>
        {topThree.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {isTerminal
              ? "No qualifying candidates surfaced. Consider broadening the criteria (geography, cause, amount range)."
              : "Top recommendations will appear here once the pipeline finishes ranking."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {topThree.map((candidate) => (
              <CandidateCard
                key={candidate.fundingOrganizationId}
                candidate={candidate}
                variant="one-pager"
              />
            ))}
          </div>
        )}
      </section>

      {remaining.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Full ranked list</h2>
          <div className="flex flex-col gap-3">
            {remaining.map((candidate) => (
              <CandidateCard
                key={candidate.fundingOrganizationId}
                candidate={candidate}
                variant="detail"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
