"use client";

import type { useDonorReportStream } from "@/hooks/useDonorReportStream";
import type { ResearchReportDetail } from "@/types/donor-research";
import { CandidateProgress } from "../report-viewer/CandidateProgress";
import { DisqualificationSummary } from "../report-viewer/DisqualificationSummary";
import { FailedReportBanner } from "../report-viewer/FailedReportBanner";
import { GeographyWarning } from "../report-viewer/GeographyWarning";
import { ProgressTimeline } from "../report-viewer/ProgressTimeline";
import { AlsoConsidered } from "./AlsoConsidered";
import { ComparisonTable } from "./ComparisonTable";
import { LeadCandidate } from "./LeadCandidate";
import { Masthead } from "./Masthead";
import { Methodology } from "./Methodology";
import { QueryDisclosure } from "./QueryDisclosure";
import { RunnerUpCandidate } from "./RunnerUpCandidate";
import { formatIssueDate } from "./text-utils";

type ReportStream = ReturnType<typeof useDonorReportStream>;

interface ReportBriefProps {
  report: ResearchReportDetail;
  isTerminal: boolean;
  /**
   * "advisor" renders the owner-only weights/share controls and diligence
   * actions — writes scoped to the report's advisor. "staff" keeps the
   * full brief (including the query disclosure) but hides those write
   * affordances and shows a breadcrumb back to the admin overview.
   * "shared" additionally hides the query disclosure so the donor share
   * view never reveals the advisor's search criteria.
   */
  variant?: "advisor" | "shared" | "staff";
  /**
   * Live SSE stream — advisor view only. Omitted on the unauthenticated share
   * view (which refreshes via polling instead), so the running panel is hidden.
   */
  stream?: ReportStream | null;
}

/**
 * Presentational report brief (Soft redesign, spec 2.3). Pure rendering —
 * no data fetching — so the authenticated report view (`ReportBriefView`)
 * and the public donor share view (`SharedReportView`) render the EXACT
 * same document from the same payload shape.
 *
 * `data-brief` on the root is a required anchor: `AnchoredAffordances`
 * (donor comment pins) queries `[data-brief]` as the discovery root, and
 * every `data-section` value below must keep matching
 * `COMMENT_SECTION_KEYS` verbatim (anchor/types.ts) so existing comments
 * keep resolving.
 */
export function ReportBrief({
  report,
  isTerminal,
  variant = "advisor",
  stream = null,
}: ReportBriefProps) {
  const candidates = report.candidates ?? [];
  const featured = candidates.filter((c) => c.featuredFlag);
  const remaining = candidates.filter((c) => !c.featuredFlag);
  const weights = report.weights ?? null;
  // Diligence + intro actions are owner-only writes — the donor shared view
  // must never surface them (they'd reveal that diligence is in flight) and
  // staff can't use them (the endpoints are advisor-scoped).
  const showDiligenceActions = variant === "advisor";

  return (
    <div className="flex flex-col gap-6" data-brief>
      <Masthead
        candidatesCount={candidates.length}
        isTerminal={isTerminal}
        report={report}
        surfacedCount={featured.length}
        variant={variant}
      />

      {/* A freshly-running report with no candidates yet would otherwise show
       * "0 Considered / 0 Surfaced" — hide the strip until there's a real
       * count to show (repo rule: never render zero-count blocks), unless
       * the report is terminal (a genuinely empty result is still data). */}
      {candidates.length > 0 || isTerminal ? (
        <SummaryStrip
          considered={candidates.length}
          issuedAt={report.fastCompletedAt ?? report.completedAt ?? report.createdAt}
          mode={report.mode}
          reportId={report.id}
          surfaced={featured.length}
        />
      ) : null}

      {variant === "shared" ? null : (
        <QueryDisclosure criteria={report.criteria} donorHandleLabel={report.donorHandleLabel} />
      )}

      {stream && !isTerminal ? (
        <>
          <p className="text-[13.5px] text-sf-muted">
            The brief is assembling in place — feel free to navigate away and return.
          </p>
          <ProgressTimeline
            errorCount={stream.errorCount}
            events={stream.events}
            latest={stream.latest}
          />
          <CandidateProgress events={stream.events} />
        </>
      ) : null}

      {report.status === "failed" ? <FailedReportBanner report={report} /> : null}

      {isTerminal ? <GeographyWarning diagnostic={report.geographyDiagnostic} /> : null}

      {isTerminal && featured.length === 0 && candidates.length > 0 ? (
        <DisqualificationSummary candidates={candidates} />
      ) : null}

      {featured[0] ? (
        <LeadCandidate
          candidate={featured[0]}
          hasMore={candidates.length > 1}
          reportId={report.id}
          showDiligenceActions={showDiligenceActions}
          weights={weights}
        />
      ) : null}

      {featured.slice(1).map((candidate, i) => (
        <RunnerUpCandidate
          candidate={candidate}
          key={candidate.id}
          label={labelForRank(i + 2)}
          rank={i + 2}
          reportId={report.id}
          showDiligenceActions={showDiligenceActions}
          weights={weights}
        />
      ))}

      {featured.length >= 2 ? <ComparisonTable candidates={featured} weights={weights} /> : null}

      {remaining.length > 0 ? (
        <AlsoConsidered
          candidates={remaining}
          reportId={report.id}
          showDiligenceActions={showDiligenceActions}
          startRank={featured.length + 1}
          weights={weights}
        />
      ) : null}

      {(isTerminal || candidates.length > 0) && report.status !== "failed" ? (
        <Methodology
          candidatesCount={candidates.length}
          geographyDiagnostic={report.geographyDiagnostic}
          surfacedCount={featured.length}
          weights={weights}
        />
      ) : null}
    </div>
  );
}

function labelForRank(rank: number): string {
  if (rank === 2) return "Runner-up";
  if (rank === 3) return "Third look";
  return "Alternate";
}

interface SummaryStripProps {
  considered: number;
  surfaced: number;
  mode: ResearchReportDetail["mode"];
  reportId: string;
  issuedAt: string;
}

/** "Number / considered / surfaced / mode / issued" stat strip (spec 2.3). */
function SummaryStrip({ considered, surfaced, mode, reportId, issuedAt }: SummaryStripProps) {
  const items = [
    { value: reportId.slice(0, 6).toUpperCase(), label: "No." },
    { value: considered, label: "Considered" },
    { value: surfaced, label: "Surfaced", emphasized: surfaced > 0 },
    { value: mode === "deep" ? "Deep" : "Fast", label: "Mode" },
    { value: formatIssueDate(issuedAt), label: "Issued" },
  ];
  return (
    <dl
      aria-label="Report summary"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-sf-tile border border-sf-line bg-sf-elev px-4 py-3"
    >
      {items.map((item) => (
        <div className="flex items-baseline gap-2" key={item.label}>
          <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-sf-muted">
            {item.label}
          </dt>
          <dd
            className={
              item.emphasized
                ? "text-[13px] font-[650] text-brand-emphasis dark:text-brand-subtle"
                : "text-[13px] font-[650] text-sf-heading"
            }
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
