"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ResearchReportCandidate } from "@/types/donor-research";
import { ComplianceBreakdown } from "./ComplianceBreakdown";
import { RecentActivity } from "./RecentActivity";

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
  // IRS 990 data is shouted in all caps; normalize so the card doesn't
  // look like a tax form.
  const rawName =
    candidate.organizationName ??
    (candidate.ein ? `EIN ${formatEin(candidate.ein)}` : "Unidentified nonprofit");
  const name = humanizeCase(rawName, "title");
  const locale = formatLocale(candidate.organizationCity, candidate.organizationState);
  const scoreBand = bandForScore(candidate.composite, isDisqualified);
  const matchReasons = isDisqualified ? [] : buildMatchReasons(candidate);
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
          <ScoreBreakdownViz candidate={candidate} reasons={matchReasons} />
        ) : null}

        {candidate.recentMentions && candidate.recentMentions.length > 0 ? (
          <RecentActivity mentions={candidate.recentMentions} />
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
  key: "donorMatch" | "impact" | "freshness" | "compliance";
  componentKey: "donorMatch" | "impactRecency" | "freshness" | "compliance";
  label: string;
  /** One-line explanation surfaced on hover via title attribute. */
  help: string;
  weight: number;
  tone: ReasonTone;
  text: string;
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
  const { components } = candidate;
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
          const score = components[reason.componentKey];
          const scorePct = Math.round(score * 100);
          return (
            <li key={reason.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span
                  className="inline-flex items-center gap-1 font-medium text-foreground"
                  title={reason.help}
                >
                  {reason.label}
                  <span
                    role="img"
                    aria-label="What this means"
                    title={reason.help}
                    className="inline-flex h-3 w-3 cursor-help items-center justify-center rounded-full border border-muted-foreground/40 text-[8px] font-semibold leading-none text-muted-foreground/70 hover:border-muted-foreground hover:text-foreground"
                  >
                    ?
                  </span>
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
            const score = components[reason.componentKey];
            const contribution = score * reason.weight * 100;
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

/**
 * Component weights are duplicated here from the backend's
 * composite-ranking service so the UI can show the math without a
 * round-trip. Keep in sync when the backend weights change.
 */
const COMPONENT_WEIGHTS = {
  freshness: 0.35,
  impactRecency: 0.25,
  donorMatch: 0.25,
  compliance: 0.15,
};

function buildMatchReasons(candidate: ResearchReportCandidate): MatchReason[] {
  const { components } = candidate;
  return [
    {
      key: "donorMatch",
      componentKey: "donorMatch",
      label: "Match to your criteria",
      help: "How closely the nonprofit's mission and location match your donor's stated cause, geography, and amount range.",
      weight: COMPONENT_WEIGHTS.donorMatch,
      tone: toneFor(components.donorMatch),
      text: phraseDonorMatch(components.donorMatch),
    },
    {
      key: "impact",
      componentKey: "impactRecency",
      label: "Still operating?",
      help: "Whether the nonprofit is still actively running programs, based on how recently they filed an IRS 990 and the freshness of their grant activity.",
      weight: COMPONENT_WEIGHTS.impactRecency,
      tone: toneFor(components.impactRecency),
      text: phraseImpact(components.impactRecency),
    },
    {
      key: "freshness",
      componentKey: "freshness",
      label: "Online presence",
      help: "Whether the nonprofit has recently published content or appeared in news coverage. Powered by a Exa search disambiguated against IRS facts (EIN, name, locale).",
      weight: COMPONENT_WEIGHTS.freshness,
      tone: toneFor(components.freshness),
      text: phraseFreshness(
        components.freshness,
        candidate.activitySignalStatus,
        candidate.recentMentions,
      ),
    },
    {
      key: "compliance",
      componentKey: "compliance",
      label: "Compliance",
      help: "Whether the nonprofit passes the IRS Pub 78 active-501(c)(3) check, has a recent 990 on file, and (for California orgs) is current on the state charity registry.",
      weight: COMPONENT_WEIGHTS.compliance,
      tone: toneFor(components.compliance),
      text: phraseCompliance(components.compliance, candidate.complianceVerdict),
    },
  ];
}

function phraseCompliance(
  score: number,
  verdict: ResearchReportCandidate["complianceVerdict"]
): string {
  if (verdict === "verified") return "Fully verified across IRS and state registries.";
  if (verdict === "partial") return "Mostly verified with one caveat — see the breakdown below.";
  if (verdict === "flagged") return "Compliance flags surfaced — review carefully before outreach.";
  if (score >= 0.6) return "Compliance checks passed.";
  return "Limited compliance signal — review the breakdown below.";
}

function toneFill(tone: ReasonTone): string {
  if (tone === "good") return "bg-brand";
  if (tone === "neutral") return "bg-muted-foreground/40";
  return "bg-amber-500/70";
}

function toneFor(score: number): ReasonTone {
  if (score >= 0.6) return "good";
  if (score >= 0.3) return "neutral";
  return "weak";
}

function phraseDonorMatch(score: number): string {
  if (score >= 0.65) return "Their mission and location match your criteria closely.";
  if (score >= 0.4) return "Their mission and location are a solid match for your criteria.";
  if (score >= 0.2) return "Adjacent to your criteria but not a central match.";
  return "Limited overlap with your criteria — consider broadening cause or geography.";
}

function phraseImpact(score: number): string {
  if (score >= 0.65) return "Filed a recent 990 and shows active grant activity.";
  if (score >= 0.4)
    return "Filed a 990 in the last couple of years; some recent grant activity on record.";
  if (score >= 0.2)
    return "Their most recent IRS 990 is a few years old — they may still be running, just quieter on the record.";
  return "No recent IRS filing or grant activity in our index — may have wound down.";
}

function phraseFreshness(
  score: number,
  activity: ResearchReportCandidate["activitySignalStatus"],
  mentions: ResearchReportCandidate["recentMentions"] | undefined,
): string {
  // When we have a validated mention, lead with the concrete date —
  // it's more useful than a generic band phrase ("a few weeks").
  const mostRecent = pickMostRecentDateMs(mentions ?? []);
  if (mostRecent !== null) {
    const days = Math.max(
      0,
      Math.floor((Date.now() - mostRecent) / 86400_000),
    );
    if (days <= 7) return "Mentioned in the last week across web or news.";
    if (days <= 30)
      return `Most recent public mention about ${days} days ago.`;
    if (days <= 90)
      return `Most recent public mention about ${Math.round(days / 7)} weeks ago.`;
    if (days <= 365)
      return `Most recent public mention about ${Math.round(days / 30)} months ago.`;
    return "No public mentions in the last year.";
  }
  if (activity === "no_signal") {
    return "We couldn't find any recent public mentions.";
  }
  if (score >= 0.65) return "Recently active across web and news.";
  if (score >= 0.4) return "Some recent web or news activity.";
  if (score >= 0.2) return "Light recent activity — most signals are months old.";
  return "No fresh public mentions surfaced.";
}

function pickMostRecentDateMs(
  mentions: ResearchReportCandidate["recentMentions"],
): number | null {
  let best: number | null = null;
  for (const m of mentions) {
    if (!m.publishedDate) continue;
    const t = Date.parse(m.publishedDate);
    if (Number.isNaN(t)) continue;
    if (best === null || t > best) best = t;
  }
  return best;
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

// Words to always lowercase in title case (articles, conjunctions, short
// prepositions), unless they're the first or last word.
const TITLE_CASE_LOWERCASE = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "onto",
  "or",
  "per",
  "the",
  "to",
  "up",
  "via",
  "vs",
  "vs.",
  "with",
]);

// Common acronyms / proper-noun fragments that should keep their case.
const KEEP_AS_IS = new Set([
  "USA",
  "U.S.",
  "U.S.A.",
  "UK",
  "EU",
  "NYC",
  "LA",
  "SF",
  "DC",
  "IRS",
  "LLC",
  "LLP",
  "Inc.",
  "Inc",
  "Co.",
  "Co",
  "Corp.",
  "Corp",
  "Ltd.",
  "Ltd",
  "II",
  "III",
  "IV",
  "VI",
  "VII",
  "VIII",
  "IX",
  "XI",
  "501c3",
  "STEM",
  "LGBT",
  "LGBTQ",
  "LGBTQ+",
  "HIV",
  "AIDS",
  "CDC",
  "FBI",
  "CIA",
  "NASA",
  "MIT",
]);

/**
 * Normalize a string that may be SHOUTED IN ALL CAPS (the IRS 990 data
 * convention) into Title Case or Sentence case. Leaves correctly-cased
 * text alone — only kicks in when >70% of alphabetic characters are
 * uppercase, which is the all-caps signature.
 */
function humanizeCase(input: string, mode: "title" | "sentence"): string {
  if (!input) return input;
  const letters = input.replace(/[^A-Za-z]/g, "");
  if (letters.length === 0) return input;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  const ratio = upper / letters.length;
  // Already mixed-case — assume the writer knew what they meant.
  if (ratio < 0.7) return input;

  if (mode === "title") return toTitleCase(input);
  return toSentenceCase(input);
}

function toTitleCase(input: string): string {
  const tokens = input.split(/(\s+|[-—–/])/);
  const wordIndices: number[] = [];
  tokens.forEach((tok, i) => {
    if (/^[A-Za-z]/.test(tok)) wordIndices.push(i);
  });
  const lastWord = wordIndices[wordIndices.length - 1] ?? -1;

  return tokens
    .map((tok, i) => {
      if (!/^[A-Za-z]/.test(tok)) return tok;
      if (KEEP_AS_IS.has(tok)) return tok;
      const lower = tok.toLowerCase();
      const isFirst = i === wordIndices[0];
      const isLast = i === lastWord;
      if (!isFirst && !isLast && TITLE_CASE_LOWERCASE.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function toSentenceCase(input: string): string {
  // Lowercase everything, then uppercase the first letter of each
  // sentence and standalone "I". Preserve KEEP_AS_IS tokens that
  // appear verbatim with word boundaries.
  const lower = input.toLowerCase();
  // First pass: sentence-start uppercase.
  const sentenced = lower.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_, lead, ch) => `${lead}${ch.toUpperCase()}`
  );
  // Restore standalone "I"
  const withI = sentenced.replace(/\bi\b/g, "I");
  // Restore acronyms (case-insensitive whole-word match against KEEP_AS_IS).
  let result = withI;
  for (const token of KEEP_AS_IS) {
    const safe = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${safe}\\b`, "gi"), token);
  }
  return result;
}
