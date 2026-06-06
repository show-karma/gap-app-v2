"use client";

import pluralize from "pluralize";
import { useDonorReportStream } from "@/hooks/useDonorReportStream";
import { useDonorReport } from "@/hooks/useDonorReports";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { DonorResearchLoading } from "../common/DonorResearchLoading";
import { StatusBadge } from "../report-list/StatusBadge";
import { CandidateCard } from "./CandidateCard";
import { DisqualificationSummary } from "./DisqualificationSummary";
import { FailedReportBanner } from "./FailedReportBanner";
import { GeographyWarning } from "./GeographyWarning";
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
  // Gate the SSE connection on report status so we don't open a stream
  // (and thus trigger the browser's native auto-reconnect loop) for a
  // report that already finished before the user landed on this page.
  const reportStatus = reportQuery.data?.status;
  const isTerminal =
    reportStatus === "complete" || reportStatus === "fast_complete" || reportStatus === "failed";
  const stream = useDonorReportStream(isTerminal ? null : reportId);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="mb-8 border-b border-border/60 pb-6">
        <Link
          href={PAGES.DONOR_RESEARCH.INDEX}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>←</span>
          Back to donor research
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {report.mode === "deep" ? "Deep research report" : "Fast research report"}
            </p>
            <h1 className="mt-1 text-balance text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              {candidates.length === 0
                ? "Awaiting candidate ranking"
                : `${candidates.length} ${pluralize("candidate", candidates.length)} considered`}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={report.status} />
              {topThree.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {topThree.length} top {pluralize("recommendation", topThree.length)} surfaced
                </span>
              ) : null}
            </div>
          </div>
          {isTerminal ? (
            <ShareTokenControls
              reportId={reportId}
              hasShareToken={report.hasShareToken}
              shareTokenExpiresAt={report.shareTokenExpiresAt}
            />
          ) : null}
        </div>
      </header>

      {!isTerminal ? (
        <section className="mb-6 flex flex-col gap-4">
          <NavigateAwayHint />
          <ProgressTimeline
            events={stream.events}
            latest={stream.latest}
            errorCount={stream.errorCount}
          />
        </section>
      ) : null}

      {report.status === "failed" ? <FailedReportBanner report={report} /> : null}

      {isTerminal ? (
        <GeographyWarning diagnostic={report.geographyDiagnostic} />
      ) : null}

      {isTerminal && topThree.length === 0 && candidates.length > 0 ? (
        <DisqualificationSummary candidates={candidates} />
      ) : null}

      <section className="mb-10">
        <SectionHeading
          eyebrow="Top recommendations"
          title="Lead with these three."
          subtitle="Highest composite scores after compliance and activity weighting."
        />
        {topThree.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            {isTerminal
              ? candidates.length === 0
                ? "No candidates matched the criteria. Try broadening the geography or cause so the pool draws from a different stratum."
                : "No qualifying candidates surfaced — see the compliance summary above. Consider broadening the criteria (geography, cause, amount range)."
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
          <SectionHeading
            eyebrow={`Full ranked list · ${remaining.length}`}
            title="Everyone else the pool surfaced."
            subtitle="Ranked by composite. Disqualified candidates kept inline for transparency."
          />
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

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

function SectionHeading({ eyebrow, title, subtitle }: SectionHeadingProps) {
  return (
    <header className="mb-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-medium tracking-tight text-foreground">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}

function NavigateAwayHint() {
  return (
    <div className="rounded-lg border border-border bg-brand-faint/40 px-4 py-3 text-sm dark:bg-brand-emphasis/10">
      <p className="font-medium text-foreground">This run takes about five minutes.</p>
      <p className="mt-0.5 text-pretty leading-relaxed text-muted-foreground">
        Feel free to navigate away — the pipeline keeps running on our end. You can return to this
        report any time from the{" "}
        <Link
          href={PAGES.DONOR_RESEARCH.INDEX}
          className="text-brand-emphasis underline-offset-2 hover:underline dark:text-brand-subtle"
        >
          donor research dashboard
        </Link>{" "}
        and pick up where it left off.
      </p>
    </div>
  );
}
