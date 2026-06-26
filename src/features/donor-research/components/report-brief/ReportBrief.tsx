"use client";

import type { useDonorReportStream } from "@/hooks/useDonorReportStream";
import type { ResearchReportDetail } from "@/types/donor-research";
import { DisqualificationSummary } from "../report-viewer/DisqualificationSummary";
import { FailedReportBanner } from "../report-viewer/FailedReportBanner";
import { GeographyWarning } from "../report-viewer/GeographyWarning";
import { ProgressTimeline } from "../report-viewer/ProgressTimeline";
import { AlsoConsidered } from "./AlsoConsidered";
import { ComparisonTable } from "./ComparisonTable";
import { briefDisplay, briefProse } from "./fonts";
import { LeadCandidate } from "./LeadCandidate";
import { Masthead } from "./Masthead";
import { Methodology } from "./Methodology";
import { QueryDisclosure } from "./QueryDisclosure";
import { RunnerUpCandidate } from "./RunnerUpCandidate";

type ReportStream = ReturnType<typeof useDonorReportStream>;

interface ReportBriefProps {
  report: ResearchReportDetail;
  isTerminal: boolean;
  /**
   * "advisor" renders the dashboard back-link + share controls; "shared"
   * hides those advisor-only affordances so the donor share view is visually
   * identical to the advisor report, minus controls a donor can't use.
   */
  variant?: "advisor" | "shared";
  /**
   * Live SSE stream — advisor view only. Omitted on the unauthenticated share
   * view (which refreshes via polling instead), so the running panel is hidden.
   */
  stream?: ReportStream | null;
}

/**
 * Presentational editorial brief. Pure rendering — no data fetching — so the
 * authenticated report view (`ReportBriefView`) and the public donor share
 * view (`SharedReportView`) render the EXACT same document from the same
 * payload shape.
 */
export function ReportBrief({
  report,
  isTerminal,
  variant = "advisor",
  stream = null,
}: ReportBriefProps) {
  const candidates = report.candidates ?? [];
  const topThree = candidates.filter((c) => c.topThreeFlag);
  const remaining = candidates.filter((c) => !c.topThreeFlag);
  // Diligence + intro actions are advisor-only — the donor shared view must
  // never surface them (they'd reveal that diligence is in flight).
  const showDiligenceActions = variant !== "shared";

  return (
    <div
      className={`${briefDisplay.variable} ${briefProse.variable} relative bg-background`}
      data-brief
    >
      <div className="mx-auto max-w-[1100px] px-5 pb-24 pt-10 sm:px-10 sm:pb-32 sm:pt-14 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-safe:ease-out">
        <Masthead
          report={report}
          candidatesCount={candidates.length}
          surfacedCount={topThree.length}
          isTerminal={isTerminal}
          variant={variant}
        />

        {variant === "shared" ? null : (
          <QueryDisclosure criteria={report.criteria} donorHandleLabel={report.donorHandleLabel} />
        )}

        {stream && !isTerminal ? (
          <RunningPanel
            events={stream.events}
            latest={stream.latest}
            errorCount={stream.errorCount}
          />
        ) : null}

        {report.status === "failed" ? (
          <div className="mb-12">
            <FailedReportBanner report={report} />
          </div>
        ) : null}

        {isTerminal ? <GeographyWarning diagnostic={report.geographyDiagnostic} /> : null}

        {isTerminal && topThree.length === 0 && candidates.length > 0 ? (
          <div className="mb-12">
            <DisqualificationSummary candidates={candidates} />
          </div>
        ) : null}

        {topThree[0] ? (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 motion-safe:delay-100">
            <LeadCandidate
              candidate={topThree[0]}
              reportId={report.id}
              showDiligenceActions={showDiligenceActions}
            />
          </div>
        ) : null}

        {topThree.slice(1).map((candidate, i) => {
          const number = String(i + 2).padStart(2, "0");
          const label = labelForRank(i + 2);
          return (
            <div
              key={candidate.id}
              className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700"
              style={{ animationDelay: `${200 + i * 100}ms` }}
            >
              <RunnerUpCandidate
                candidate={candidate}
                number={number}
                label={label}
                reportId={report.id}
                showDiligenceActions={showDiligenceActions}
              />
            </div>
          );
        })}

        {topThree.length >= 2 ? <ComparisonTable candidates={topThree} /> : null}

        {remaining.length > 0 ? (
          <AlsoConsidered
            candidates={remaining}
            startRank={topThree.length + 1}
            reportId={report.id}
            showDiligenceActions={showDiligenceActions}
          />
        ) : null}

        {(isTerminal || candidates.length > 0) && report.status !== "failed" ? (
          <Methodology
            candidatesCount={candidates.length}
            surfacedCount={topThree.length}
            geographyDiagnostic={report.geographyDiagnostic}
          />
        ) : null}
      </div>
    </div>
  );
}

function labelForRank(rank: number): string {
  if (rank === 2) return "Runner-up";
  if (rank === 3) return "Third look";
  return "Alternate";
}

interface RunningPanelProps {
  events: ReportStream["events"];
  latest: ReportStream["latest"];
  errorCount: number;
}

function RunningPanel({ events, latest, errorCount }: RunningPanelProps) {
  return (
    <section className="mb-14 border-y border-border/70 py-8">
      <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
        Status
      </p>
      <h2 className="mt-2 max-w-[42ch] text-balance text-[clamp(1.25rem,2.4vw,1.625rem)] font-medium leading-tight tracking-[-0.012em] text-foreground">
        The brief is assembling in place — feel free to navigate away and return.
      </h2>
      <div className="mt-6">
        <ProgressTimeline events={events} latest={latest} errorCount={errorCount} />
      </div>
    </section>
  );
}
