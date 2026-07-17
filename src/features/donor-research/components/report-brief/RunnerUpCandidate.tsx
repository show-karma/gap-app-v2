"use client";

import { memo } from "react";
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
import { compositeBand } from "./scoring";
import {
  formatEin,
  formatLocale,
  humanizeCase,
  mostRecentMentionDate,
  relativeDays,
} from "./text-utils";

interface RunnerUpCandidateProps {
  candidate: ResearchReportCandidate;
  /** 1-based rank — 2 or 3. */
  rank: number;
  /** Editorial label shown next to the rank badge. */
  label: string;
  /** Persisted report weights for the score breakdown; `null` = legacy. */
  weights: CompositeWeights | null;
  /** Report id — required to mount the advisor diligence actions. */
  reportId?: string;
  /** Advisor-only: gates the Ask Questions / Connect footer. */
  showDiligenceActions?: boolean;
}

/**
 * Rank 2 / rank 3 candidate. Built from the same shared chrome as
 * {@link LeadCandidate} at a smaller scale — no dedicated hero, tighter
 * spacing, a shorter coverage list — but the same card structure (rank
 * badge, org meta row, composite readout, "Our take" callout, data
 * tables).
 */
export const RunnerUpCandidate = memo(function RunnerUpCandidate({
  candidate,
  rank,
  label,
  weights,
  reportId,
  showDiligenceActions = false,
}: RunnerUpCandidateProps) {
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
  const ourTake = candidate.onePagerText?.trim() ?? candidate.reasoningSummary?.trim() ?? null;
  const mentions = candidate.recentMentions ?? [];
  const composite100 = Math.round(candidate.composite * 100);
  const band = compositeBand(candidate.composite, isDisqualified);
  const lastMention = relativeDays(mostRecentMentionDate(mentions));

  return (
    <section
      className="rounded-sf-card border border-sf-line bg-sf-card p-6"
      data-section="runners-up"
      data-candidate-id={candidate.id}
    >
      <RankBadge emphasis="runner-up" label={label} rank={rank} />

      <div className="mt-3">
        <CandidateName disqualified={isDisqualified} name={name} size="runner-up" />
        <CandidateMetaRow
          ein={candidate.ein}
          locale={locale}
          showEin={!!candidate.organizationName}
          websiteUrl={candidate.organizationWebsiteUrl}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="min-w-0">
          {description ? (
            <p className="max-w-[62ch] text-[14px] leading-[1.55] text-sf-ink">{description}</p>
          ) : null}

          {ourTake ? (
            <div className="mt-4">
              <OurTake text={ourTake} />
            </div>
          ) : null}

          <FinancialsTable financials={candidate.financials} />

          {mentions.length > 0 ? <CandidateCoverage limit={3} mentions={mentions} /> : null}

          <SocialPresence metrics={candidate.socialMetrics} />
        </div>

        <aside className="min-w-0">
          <CompositeReadout
            band={band}
            composite100={composite100}
            disqualified={isDisqualified}
            size="runner-up"
          />

          <ScoreBreakdownTable candidate={candidate} weights={weights} />

          <ComplianceStrip candidate={candidate} />

          {lastMention ? <LastMention label={lastMention} /> : null}
        </aside>
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
});

RunnerUpCandidate.displayName = "RunnerUpCandidate";
