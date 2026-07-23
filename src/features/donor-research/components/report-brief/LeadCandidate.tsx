"use client";

import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { CandidateDiligenceActions } from "../diligence/CandidateDiligenceActions";
import { SocialPresence } from "../report-viewer/SocialPresence";
import {
  CandidateCoverage,
  CandidateMetaRow,
  CandidateName,
  CompositeReadout,
  LastMention,
  OurTake,
  RankBadge,
} from "./CandidateChrome";
import { ComplianceStrip } from "./ComplianceStrip";
import { FinancialsTable } from "./FinancialsTable";
import { ScoreBreakdownTable } from "./ScoreBreakdownTable";
import { compositeBand, leadJustification } from "./scoring";
import {
  formatEin,
  formatLocale,
  humanizeCase,
  mostRecentMentionDate,
  relativeDays,
} from "./text-utils";

interface LeadCandidateProps {
  candidate: ResearchReportCandidate;
  /** Persisted report weights for the score breakdown; `null` = legacy. */
  weights: CompositeWeights | null;
  /**
   * Whether the brief has any other candidates below the lead (runner-ups or
   * "also considered"). Drives the "Read on for the runners-up…" line so it
   * isn't shown on a single-candidate report (QA finding).
   */
  hasMore: boolean;
  /** Report id — required to mount the advisor diligence actions. */
  reportId?: string;
  /** Advisor-only: gates the Ask Questions / Connect footer. */
  showDiligenceActions?: boolean;
}

/**
 * The lead recommendation. An `sf-card`, visually richer than a runner-up
 * (larger name, two-column body) but built from the same shared chrome —
 * rank badge, org meta row, composite readout, "Our take" callout, data
 * tables (spec 2.3: "same component structure").
 */
export function LeadCandidate({
  candidate,
  weights,
  hasMore,
  reportId,
  showDiligenceActions = false,
}: LeadCandidateProps) {
  const isDisqualified = candidate.complianceVerdict === "disqualified";
  const name = humanizeCase(
    candidate.organizationName ??
      (candidate.ein ? `EIN ${formatEin(candidate.ein)}` : "Unidentified nonprofit"),
    "title"
  );
  const locale = formatLocale(candidate.organizationCity, candidate.organizationState);
  const description = candidate.organizationDescription
    ? humanizeCase(candidate.organizationDescription.trim(), "sentence")
    : null;
  const body = pickBodyText(candidate);
  const ourTake = candidate.reasoningSummary?.trim() ?? null;
  const composite100 = Math.round(candidate.composite * 100);
  const band = compositeBand(candidate.composite, isDisqualified);
  const recent = candidate.recentMentions ?? [];
  const mostRecentMs = mostRecentMentionDate(recent);
  const mostRecentLabel = relativeDays(mostRecentMs);

  return (
    <section
      className="rounded-sf-card border border-sf-line bg-sf-card px-6 py-6 sm:px-8 sm:py-8"
      data-section="lead-candidate"
      data-candidate-id={candidate.id}
    >
      <RankBadge emphasis="lead" label="Lead recommendation" rank={1} />

      <div className="mt-4">
        <CandidateName disqualified={isDisqualified} name={name} size="lead" />
        <CandidateMetaRow
          ein={candidate.ein}
          locale={locale}
          showEin={true}
          websiteUrl={candidate.organizationWebsiteUrl}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0">
          {description ? (
            <p className="max-w-[62ch] text-[15px] leading-[1.55] text-sf-ink">{description}</p>
          ) : null}

          {body.paragraphs.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              {body.paragraphs.map((para) => (
                <p
                  className="max-w-[62ch] text-[15px] leading-[1.6] text-sf-ink"
                  key={para.slice(0, 48)}
                >
                  {para}
                </p>
              ))}
            </div>
          ) : null}

          {ourTake ? (
            <div className="mt-5">
              <OurTake text={ourTake} />
            </div>
          ) : null}

          <FinancialsTable financials={candidate.financials} />

          {recent.length > 0 ? <CandidateCoverage limit={4} mentions={recent} /> : null}

          <SocialPresence metrics={candidate.socialMetrics} />
        </div>

        <aside className="min-w-0 lg:border-l lg:border-sf-line lg:pl-8">
          <CompositeReadout
            band={band}
            composite100={composite100}
            disqualified={isDisqualified}
            size="lead"
          />

          <ScoreBreakdownTable candidate={candidate} weights={weights} />

          <ComplianceStrip candidate={candidate} />

          {mostRecentLabel ? <LastMention label={mostRecentLabel} /> : null}
        </aside>
      </div>

      <div className="mt-8 border-t border-sf-line pt-5">
        <p className="text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
          Why this leads
        </p>
        <p className="mt-1.5 max-w-[72ch] text-[13.5px] leading-[1.55] text-sf-muted">
          This recommendation leads the pool on{" "}
          <span className="text-sf-ink">{leadJustification(candidate)}</span>
          {hasMore ? " Read on for the runners-up and the full comparison." : null}
        </p>
      </div>

      {showDiligenceActions && reportId ? (
        <CandidateDiligenceActions
          candidateId={candidate.id}
          candidateName={name}
          reportId={reportId}
        />
      ) : null}
    </section>
  );
}

interface BodyText {
  paragraphs: readonly string[];
}

function pickBodyText(candidate: ResearchReportCandidate): BodyText {
  const source = candidate.detailedText?.trim() || candidate.onePagerText?.trim() || null;
  if (!source) return { paragraphs: [] };
  const cleaned = source
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return { paragraphs: cleaned };
}
