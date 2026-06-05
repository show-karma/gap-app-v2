"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ResearchReportCandidate } from "@/types/donor-research";
import { ScoreBreakdown } from "./ScoreBreakdown";

interface CandidateCardProps {
  candidate: ResearchReportCandidate;
  variant: "one-pager" | "detail";
}

/**
 * Per-candidate card (U13c, post-impeccable redesign).
 *
 * The candidate is presented as an editorial recommendation, not a
 * database row. Nonprofit name leads; the EIN is metadata. The
 * composite score is anchored to a qualitative band so the advisor
 * doesn't have to interpret a raw 0.39 in a vacuum.
 *
 * - `variant="one-pager"` renders the top-3 view: composite + one-pager
 *   prose treated like a pull quote.
 * - `variant="detail"` renders the full-list row: tighter, score bar
 *   inline, detailed reasoning behind a disclosure.
 *
 * Disqualified candidates render with a muted treatment + clear label
 * — never `opacity-70` which reads as broken UI rather than intent.
 */
export function CandidateCard({ candidate, variant }: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDisqualified = candidate.complianceVerdict === "disqualified";
  const name =
    candidate.organizationName ??
    (candidate.ein ? `EIN ${formatEin(candidate.ein)}` : "Unidentified nonprofit");
  const locale = formatLocale(candidate.organizationCity, candidate.organizationState);
  const scoreBand = bandForScore(candidate.composite, isDisqualified);

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors ${
        isDisqualified ? "border-border/60 bg-muted/30" : "border-border hover:border-brand/40"
      }`}
    >
      {/* Top hairline accent on the brand color reads as a curatorial
          mark, not an information element. Disqualified cards skip it. */}
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

          {/* Composite score column: large display number anchored to
              qualitative band copy. The band is the recommendation. */}
          <div className="text-right">
            <p
              className={`font-mono text-3xl tabular-nums leading-none ${
                isDisqualified ? "text-muted-foreground" : "text-foreground"
              }`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {candidate.composite.toFixed(2)}
            </p>
            <p
              className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                scoreBand.tone
              }`}
            >
              {scoreBand.label}
            </p>
          </div>
        </header>

        <ScoreBreakdown
          components={candidate.components}
          activityStatus={candidate.activitySignalStatus}
        />

        {candidate.reasoningSummary ? (
          <p className="text-sm leading-relaxed text-foreground">{candidate.reasoningSummary}</p>
        ) : null}

        {variant === "one-pager" && candidate.onePagerText ? (
          <blockquote className="border-t border-border/60 pt-4 text-sm italic leading-relaxed text-foreground/90 [&::before]:mr-1 [&::before]:font-mono [&::before]:not-italic [&::before]:text-brand-emphasis [&::before]:content-['❝']">
            {candidate.onePagerText}
          </blockquote>
        ) : null}

        {/* Metadata footer: small + monospace = "telemetry," not body text. */}
        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          <MetaPill
            label="Compliance"
            value={candidate.complianceVerdict}
            tone={complianceTone(candidate.complianceVerdict)}
          />
          <MetaPill
            label="Activity"
            value={activityLabel(candidate.activitySignalStatus)}
            tone={activityTone(candidate.activitySignalStatus)}
          />
          {candidate.stateRegistrationStatus !== "verified" &&
          candidate.stateRegistrationStatus !== "data_not_yet_indexed" ? (
            <MetaPill
              label="State filing"
              value={candidate.stateRegistrationStatus.replace(/_/g, " ")}
              tone="warn"
            />
          ) : null}
        </footer>

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

function complianceTone(verdict: ResearchReportCandidate["complianceVerdict"]): MetaTone {
  if (verdict === "verified") return "ok";
  if (verdict === "partial") return "warn";
  if (verdict === "disqualified") return "muted";
  return "warn";
}

function activityTone(status: ResearchReportCandidate["activitySignalStatus"]): MetaTone {
  if (status === "ok") return "ok";
  if (status === "scrape_failed") return "muted";
  if (status === "no_signal") return "muted";
  return "warn";
}

function activityLabel(status: ResearchReportCandidate["activitySignalStatus"]): string {
  if (status === "scrape_failed") return "scrape failed";
  if (status === "no_signal") return "no signal";
  return status;
}

type MetaTone = "ok" | "warn" | "muted";

function MetaPill({ label, value, tone }: { label: string; value: string; tone: MetaTone }) {
  // Restrained meta chips: a colored dot anchors the tone, the label
  // stays the same neutral, the value carries the meaning. Avoids the
  // pill-as-background-color anti-pattern.
  const dot =
    tone === "ok"
      ? "bg-brand"
      : tone === "warn"
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-muted-foreground/50";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>
        <span className="text-muted-foreground/70">{label}</span>{" "}
        <span className="text-foreground">{value}</span>
      </span>
    </span>
  );
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
