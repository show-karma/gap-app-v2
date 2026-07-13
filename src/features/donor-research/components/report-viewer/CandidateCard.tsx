"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { CandidateDiligenceActions } from "../diligence/CandidateDiligenceActions";
import { FinancialsTable } from "../report-brief/FinancialsTable";
import { compositeBand } from "../report-brief/scoring";
import { formatEin, hostname, humanizeCase, truncate } from "../report-brief/text-utils";
import { ComplianceBreakdown } from "./ComplianceBreakdown";
import { buildMatchReasons, type MatchReason, type ReasonTone } from "./candidate-card-reasons";
import { formatLocale } from "./candidate-card-text";
import { RecentActivity } from "./RecentActivity";
import { SocialPresence } from "./SocialPresence";

interface CandidateCardProps {
  candidate: ResearchReportCandidate;
  variant: "one-pager" | "detail";
  /**
   * The report's persisted weights (basis points). `null` (default) renders
   * the legacy four-dimension breakdown; present renders five dimensions
   * including social presence, at the advisor's chosen weights.
   */
  weights?: CompositeWeights | null;
  /** Report id — required to mount the advisor diligence actions. */
  reportId?: string;
  /** Advisor-only: gates the Ask Questions / Connect footer. */
  showDiligenceActions?: boolean;
}

/**
 * Per-candidate card.
 *
 * The card is structured as an editorial recommendation:
 *
 *   1. Headline — nonprofit name + locale + website link
 *   2. Lead    — what the org actually does (organizationDescription).
 *                Without this the report is useless to a first-time
 *                advisor; the name alone doesn't tell them anything.
 *   3. Score   — qualitative band ("Strong fit") as the primary signal
 *                with the numeric score reframed as "70 / 100" so
 *                readers don't have to interpret 0.70 in a vacuum.
 *   4. Why     — three plain-language reasons translating each score
 *                component into something an advisor can act on,
 *                replacing the stacked color bar that was confusing
 *                on first look.
 *   5. Reasoning — synthesized prose from the LLM if present.
 *   6. Compliance breakdown — its own disclosure section, unchanged.
 *
 * Disqualified candidates render with a muted treatment + clear label.
 */
export function CandidateCard({
  candidate,
  variant,
  weights = null,
  reportId,
  showDiligenceActions = false,
}: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDisqualified = candidate.complianceVerdict === "disqualified";
  // IRS 990 data is shouted in all caps; normalize so the card doesn't
  // look like a tax form.
  const rawName =
    candidate.organizationName ??
    (candidate.ein ? `EIN ${formatEin(candidate.ein)}` : "Unidentified nonprofit");
  const name = humanizeCase(rawName, "title");
  const locale = formatLocale(candidate.organizationCity, candidate.organizationState);
  const scoreBand: BandResult = {
    label: compositeBand(candidate.composite, isDisqualified),
    tone: bandTone(candidate.composite, isDisqualified),
  };
  const matchReasons = isDisqualified ? [] : buildMatchReasons(candidate, weights);
  const description = candidate.organizationDescription
    ? humanizeCase(candidate.organizationDescription.trim(), "sentence")
    : null;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors ${
        isDisqualified ? "border-border/60 bg-muted/30" : "border-border hover:border-brand/40"
      }`}
    >
      {!isDisqualified ? (
        <span
          aria-hidden
          className="h-px w-full bg-gradient-to-r from-brand/0 via-brand/60 to-brand/0"
        />
      ) : null}

      <div className="flex flex-col gap-4 p-5">
        <CandidateHeader
          candidate={candidate}
          isDisqualified={isDisqualified}
          locale={locale}
          name={name}
          scoreBand={scoreBand}
        />

        {description ? (
          <p className="text-pretty text-sm leading-relaxed text-foreground/90">
            {truncate(description, 320)}
          </p>
        ) : null}

        {matchReasons.length > 0 ? (
          <ScoreBreakdownViz candidate={candidate} reasons={matchReasons} />
        ) : null}

        {candidate.recentMentions && candidate.recentMentions.length > 0 ? (
          <RecentActivity mentions={candidate.recentMentions} />
        ) : null}

        <SocialPresence metrics={candidate.socialMetrics} />

        {candidate.reasoningSummary ? (
          <p className="text-sm leading-relaxed text-foreground">{candidate.reasoningSummary}</p>
        ) : null}

        <FinancialsTable financials={candidate.financials} />

        {variant === "one-pager" && candidate.onePagerText ? (
          <blockquote className="border-t border-border/60 pt-4 text-sm italic leading-relaxed text-foreground/90 [&::before]:mr-1 [&::before]:font-mono [&::before]:not-italic [&::before]:text-brand-emphasis [&::before]:content-['❝']">
            {candidate.onePagerText}
          </blockquote>
        ) : null}

        {candidate.complianceChecks && candidate.complianceChecks.length > 0 ? (
          <ComplianceBreakdown
            checks={candidate.complianceChecks}
            defaultOpen={variant === "one-pager"}
          />
        ) : null}

        {variant === "detail" ? (
          <details
            open={expanded}
            onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}
            className="group/details"
          >
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ChevronDown
                className="h-3 w-3 transition-transform group-open/details:rotate-180"
                aria-hidden
              />
              {expanded ? "Hide detailed reasoning" : "Show detailed reasoning"}
            </summary>
            {candidate.detailedText ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {candidate.detailedText}
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No detailed text available for this candidate.
              </p>
            )}
          </details>
        ) : null}

        <CandidateDiligenceFooter
          reportId={reportId}
          candidateId={candidate.id}
          candidateName={name}
          show={showDiligenceActions}
        />
      </div>
    </article>
  );
}

interface CandidateDiligenceFooterProps {
  reportId: string | undefined;
  candidateId: string;
  candidateName: string | null;
  show: boolean;
}

/**
 * Advisor-only diligence footer. Extracted so the conditional stays out of the
 * already-dense {@link CandidateCard} body. Renders nothing on the donor shared
 * view (where `show` is false / `reportId` is absent).
 */
function CandidateDiligenceFooter({
  reportId,
  candidateId,
  candidateName,
  show,
}: CandidateDiligenceFooterProps) {
  return show && reportId ? (
    <CandidateDiligenceActions
      reportId={reportId}
      candidateId={candidateId}
      candidateName={candidateName}
    />
  ) : null;
}

interface CandidateHeaderProps {
  candidate: ResearchReportCandidate;
  isDisqualified: boolean;
  locale: string | null;
  name: string;
  scoreBand: BandResult;
}

function CandidateHeader({
  candidate,
  isDisqualified,
  locale,
  name,
  scoreBand,
}: CandidateHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h3
          className={`text-balance text-lg font-medium leading-snug tracking-tight ${
            isDisqualified ? "text-muted-foreground line-through decoration-1" : "text-foreground"
          }`}
        >
          {name}
        </h3>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
          {locale ? (
            <span className="font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {locale}
            </span>
          ) : null}
          {candidate.ein && candidate.organizationName ? (
            <span className="tabular-nums text-muted-foreground/80">
              EIN&nbsp;{formatEin(candidate.ein)}
            </span>
          ) : null}
          {candidate.organizationWebsiteUrl ? (
            <a
              href={candidate.organizationWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-brand-emphasis underline-offset-2 hover:underline dark:text-brand-subtle"
            >
              {hostname(candidate.organizationWebsiteUrl)}
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      <div className="text-right">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${scoreBand.tone}`}>
          {scoreBand.label}
        </p>
        <p
          className={`mt-0.5 font-mono text-2xl leading-none tabular-nums ${
            isDisqualified ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {Math.round(candidate.composite * 100)}
          <span className="text-base text-muted-foreground">{" / 100"}</span>
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
          Match score
        </p>
      </div>
    </header>
  );
}

interface ScoreBreakdownVizProps {
  candidate: ResearchReportCandidate;
  reasons: MatchReason[];
}

/**
 * Per-component score viz that shows the advisor exactly how the
 * composite was assembled. Each row pairs a horizontal bar (component
 * score, 0-100) with the weight that determines its contribution to
 * the composite, plus a one-line plain-language explanation.
 *
 * The bars are stacked vertically (one row per component) rather than
 * the previous side-by-side weighted-stack which was unreadable. The
 * weight is shown as a multiplier (×25%) on the right of each row so
 * advisors can see which dimensions matter most.
 *
 * Bottom row shows the math: a thin stacked bar where each segment is
 * the component's contribution (score × weight), summing to the
 * composite. This is the same data as the old viz but reframed as
 * "what added up to your number" rather than "weighted breakdown."
 */
function ScoreBreakdownViz({ candidate, reasons }: ScoreBreakdownVizProps) {
  const compositePct = Math.round(candidate.composite * 100);

  return (
    <section className="rounded-md border border-border/60 bg-muted/20 p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          How we got {compositePct} / 100
        </p>
        <a
          href="#scoring-methodology"
          className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
        >
          How we score
        </a>
      </header>

      <ul className="flex flex-col gap-3">
        {reasons.map((reason) => {
          const scorePct = Math.round(reason.score * 100);
          return (
            <li key={reason.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span
                  className="inline-flex items-center gap-1 font-medium text-foreground"
                  title={reason.help}
                >
                  {reason.label}
                  <button
                    type="button"
                    aria-label={reason.help}
                    title={reason.help}
                    className="inline-flex h-3 w-3 cursor-help items-center justify-center rounded-full border border-muted-foreground/40 text-[8px] font-semibold leading-none text-muted-foreground/70 hover:border-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-brand/40"
                  >
                    ?
                  </button>
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  <span className="text-foreground">{scorePct}</span>
                  <span className="text-muted-foreground/70"> / 100</span>
                  <span className="ml-2 text-[10px] uppercase tracking-[0.06em] text-muted-foreground/70">
                    × {Math.round(reason.weight * 100)}%
                  </span>
                </span>
              </div>
              <div
                role="img"
                aria-label={`${reason.label}: ${scorePct} out of 100`}
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={`h-full transition-all ${toneFill(reason.tone)}`}
                  style={{ width: `${scorePct}%` }}
                />
              </div>
              <p className="mt-0.5 flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
                <ReasonGlyph tone={reason.tone} />
                <span className="flex-1">{reason.text}</span>
              </p>
            </li>
          );
        })}
      </ul>

      {/* Composite math: a thin stacked bar showing each component's
          contribution (score × weight), totaling the composite. */}
      <div className="mt-4 border-t border-border/60 pt-3">
        <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
          <span className="font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Composite
          </span>
          <span className="font-mono text-base tabular-nums text-foreground">
            {compositePct}
            <span className="text-xs text-muted-foreground"> / 100</span>
          </span>
        </div>
        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`Composite ${compositePct} of 100, summed from each component's weighted contribution.`}
        >
          {reasons.map((reason) => {
            const contribution = reason.score * reason.weight * 100;
            return (
              <div
                key={`contrib-${reason.key}`}
                className={toneFill(reason.tone)}
                style={{ width: `${contribution}%` }}
                title={`${reason.label}: contributed ${Math.round(contribution)}/100`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function toneFill(tone: ReasonTone): string {
  if (tone === "good") return "bg-brand";
  if (tone === "neutral") return "bg-muted-foreground/40";
  return "bg-amber-500/70";
}

function ReasonGlyph({ tone }: { tone: ReasonTone }) {
  const cls =
    tone === "good"
      ? "bg-brand/20 text-brand-emphasis dark:text-brand-subtle"
      : tone === "neutral"
        ? "bg-muted text-muted-foreground"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return (
    <span
      aria-hidden
      className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${cls}`}
    >
      {tone === "good" ? (
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5">
          <path
            d="M3 8.5l3 3 7-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : tone === "neutral" ? (
        <span className="h-px w-2 bg-current" />
      ) : (
        <span className="text-[9px] font-semibold leading-none">!</span>
      )}
    </span>
  );
}

interface BandResult {
  label: string;
  tone: string;
}

/**
 * Tone class for the band label. The label text itself comes from the
 * shared `compositeBand` in report-brief/scoring; this maps the same
 * thresholds onto the masthead color treatment.
 */
function bandTone(score: number, disqualified: boolean): string {
  if (disqualified) return "text-muted-foreground";
  if (score >= 0.6) return "text-brand-emphasis dark:text-brand-subtle";
  if (score >= 0.4) return "text-brand-emphasis dark:text-brand-subtle";
  if (score >= 0.25) return "text-foreground";
  return "text-muted-foreground";
}
