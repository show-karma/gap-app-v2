"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ResearchReportCandidate } from "@/types/donor-research";
import { ComplianceBreakdown } from "./ComplianceBreakdown";

interface CandidateCardProps {
  candidate: ResearchReportCandidate;
  variant: "one-pager" | "detail";
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
export function CandidateCard({ candidate, variant }: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDisqualified = candidate.complianceVerdict === "disqualified";
  const name =
    candidate.organizationName ??
    (candidate.ein ? `EIN ${formatEin(candidate.ein)}` : "Unidentified nonprofit");
  const locale = formatLocale(candidate.organizationCity, candidate.organizationState);
  const scoreBand = bandForScore(candidate.composite, isDisqualified);
  const matchReasons = isDisqualified ? [] : buildMatchReasons(candidate);
  const description = candidate.organizationDescription?.trim() || null;

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
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className={`text-balance text-lg font-medium leading-snug tracking-tight ${
                isDisqualified
                  ? "text-muted-foreground line-through decoration-1"
                  : "text-foreground"
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

          {/* Score column: band label as the primary signal, with the
              numeric score reframed as X / 100 so readers can put it on
              a familiar grading scale. */}
          <div className="text-right">
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${scoreBand.tone}`}
            >
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

        {description ? (
          <p className="text-pretty text-sm leading-relaxed text-foreground/90">
            {truncate(description, 320)}
          </p>
        ) : null}

        {matchReasons.length > 0 ? (
          <section className="rounded-md border border-border/60 bg-muted/20 p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Why this match
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-snug">
              {matchReasons.map((reason) => (
                <li key={reason.key} className="flex items-start gap-2">
                  <ReasonGlyph tone={reason.tone} />
                  <span className="flex-1 text-foreground/90">{reason.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
              We weigh donor alignment, impact recency, freshness, and compliance.{" "}
              <a href="#scoring-methodology" className="underline-offset-2 hover:underline">
                How we score
              </a>
            </p>
          </section>
        ) : null}

        {candidate.reasoningSummary ? (
          <p className="text-sm leading-relaxed text-foreground">{candidate.reasoningSummary}</p>
        ) : null}

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
      </div>
    </article>
  );
}

type ReasonTone = "good" | "neutral" | "weak";

interface MatchReason {
  key: string;
  tone: ReasonTone;
  text: string;
}

function buildMatchReasons(candidate: ResearchReportCandidate): MatchReason[] {
  const { components } = candidate;
  return [
    {
      key: "donorMatch",
      tone: toneFor(components.donorMatch),
      text: phraseDonorMatch(components.donorMatch),
    },
    {
      key: "impact",
      tone: toneFor(components.impactRecency),
      text: phraseImpact(components.impactRecency),
    },
    {
      key: "freshness",
      tone: toneFor(components.freshness),
      text: phraseFreshness(components.freshness, candidate.activitySignalStatus),
    },
  ];
}

function toneFor(score: number): ReasonTone {
  if (score >= 0.6) return "good";
  if (score >= 0.3) return "neutral";
  return "weak";
}

function phraseDonorMatch(score: number): string {
  if (score >= 0.65) return "Sharp alignment with your client's stated criteria.";
  if (score >= 0.4) return "Solid alignment with your client's criteria.";
  if (score >= 0.2) return "Loose alignment with the criteria — adjacent but not central.";
  return "Marginal alignment — consider broadening the criteria.";
}

function phraseImpact(score: number): string {
  if (score >= 0.65) return "Sustained recent program impact reported on the 990.";
  if (score >= 0.4) return "Recent impact visible in the 990 and program data.";
  if (score >= 0.2) return "Older impact data — most recent reporting is dated.";
  return "Limited public impact data available.";
}

function phraseFreshness(
  score: number,
  activity: ResearchReportCandidate["activitySignalStatus"]
): string {
  if (activity === "scrape_failed") {
    return "Website or social channels couldn't be reached during this run.";
  }
  if (activity === "no_signal") {
    return "No website or social handles found yet — activity unknown.";
  }
  if (score >= 0.65) return "Recently active — website and social channels updated lately.";
  if (score >= 0.4) return "Some recent activity on website or social channels.";
  if (score >= 0.2) return "Limited recent updates across web and social.";
  return "No fresh activity surfaced.";
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

function bandForScore(score: number, disqualified: boolean): BandResult {
  if (disqualified) {
    return { label: "Disqualified", tone: "text-muted-foreground" };
  }
  if (score >= 0.6)
    return { label: "Outstanding fit", tone: "text-brand-emphasis dark:text-brand-subtle" };
  if (score >= 0.4)
    return { label: "Strong fit", tone: "text-brand-emphasis dark:text-brand-subtle" };
  if (score >= 0.25) return { label: "Promising", tone: "text-foreground" };
  return { label: "Marginal", tone: "text-muted-foreground" };
}

function formatEin(ein: string): string {
  const digits = ein.replace(/[^0-9]/g, "");
  if (digits.length !== 9) return ein;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function formatLocale(city: string | null, state: string | null): string | null {
  if (city && state) return `${city}, ${state}`;
  return city ?? state ?? null;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}
