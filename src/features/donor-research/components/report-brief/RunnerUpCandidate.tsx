"use client";

import { ArrowUpRight } from "lucide-react";
import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { SocialPresence } from "../report-viewer/SocialPresence";
import { ChapterMark } from "./ChapterMark";
import { ComplianceStrip } from "./ComplianceStrip";
import { FinancialsTable } from "./FinancialsTable";
import { briefDisplay, briefProse } from "./fonts";
import { ScoreBreakdownTable } from "./ScoreBreakdownTable";
import { compositeBand } from "./scoring";
import {
  formatEin,
  formatLocale,
  hostname,
  humanizeCase,
  mostRecentMentionDate,
  relativeDays,
} from "./text-utils";

interface RunnerUpCandidateProps {
  candidate: ResearchReportCandidate;
  /** Chapter ordinal — "02" or "03". */
  number: string;
  /** Editorial label sitting at the right edge of the chapter rule. */
  label: string;
  /** Persisted report weights for the score breakdown; `null` = legacy. */
  weights: CompositeWeights | null;
}

/**
 * Rank 2 / rank 3 candidate. Half the visual weight of the lead:
 * no sidebar, no pull quote, a single short paragraph of prose,
 * and a tighter recent-coverage strip. The composite is a single
 * tabular figure hanging off the identity block rather than a
 * standalone hero.
 */
export function RunnerUpCandidate({ candidate, number, label, weights }: RunnerUpCandidateProps) {
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
  const body = candidate.onePagerText?.trim() ?? candidate.reasoningSummary?.trim() ?? null;
  const mentions = (candidate.recentMentions ?? []).slice(0, 3);
  const composite100 = Math.round(candidate.composite * 100);
  const band = compositeBand(candidate.composite, isDisqualified);
  const lastMention = relativeDays(mostRecentMentionDate(mentions));

  return (
    <section className="mb-20 sm:mb-24" data-section="runners-up" data-candidate-id={candidate.id}>
      <ChapterMark number={number} label={label} tone="runner-up" />

      <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="min-w-0">
          <header>
            <h2
              className={`${briefDisplay.className} text-balance text-[clamp(1.5rem,2.8vw,2rem)] font-medium leading-[1.1] tracking-[-0.018em] text-foreground`}
            >
              {name}
            </h2>
            <div
              className={`${briefDisplay.className} mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs`}
            >
              {locale ? (
                <span className="font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {locale}
                </span>
              ) : null}
              {candidate.ein && candidate.organizationName ? (
                <span className="tabular-nums text-muted-foreground/80">
                  EIN {formatEin(candidate.ein)}
                </span>
              ) : null}
              {candidate.organizationWebsiteUrl ? (
                <a
                  href={candidate.organizationWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-brand-emphasis underline-offset-[3px] hover:underline dark:text-brand-subtle"
                >
                  {hostname(candidate.organizationWebsiteUrl)}
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
            </div>
          </header>

          {description ? (
            <p
              className={`${briefProse.className} mt-5 max-w-[60ch] text-[1rem] leading-[1.55] text-foreground/85`}
            >
              {description}
            </p>
          ) : null}

          {body ? (
            <p
              className={`${briefProse.className} mt-4 max-w-[60ch] text-[1rem] leading-[1.6] text-foreground/80`}
            >
              {body}
            </p>
          ) : null}

          <FinancialsTable financials={candidate.financials} />

          {mentions.length > 0 ? <RunnerUpCoverage mentions={mentions} /> : null}

          <SocialPresence metrics={candidate.socialMetrics} />
        </div>

        <aside className="min-w-0 lg:pt-1">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`${briefDisplay.className} text-[clamp(2.25rem,4.4vw,3.25rem)] font-light leading-[0.85] tabular-nums tracking-[-0.03em] text-foreground`}
            >
              {composite100}
            </span>
            <span
              className={`${briefDisplay.className} text-lg font-light tabular-nums text-muted-foreground`}
            >
              /100
            </span>
          </div>
          <p
            className={`${briefDisplay.className} mt-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground`}
          >
            {band}
          </p>

          <ScoreBreakdownTable candidate={candidate} weights={weights} />

          <ComplianceStrip candidate={candidate} />

          {lastMention ? (
            <div className="mt-5 border-t border-border/60 pt-3">
              <p
                className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground`}
              >
                Last mention
              </p>
              <p className={`${briefDisplay.className} mt-0.5 text-sm text-foreground`}>
                {lastMention}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

interface RunnerUpCoverageProps {
  mentions: readonly NonNullable<ResearchReportCandidate["recentMentions"]>[number][];
}

function RunnerUpCoverage({ mentions }: RunnerUpCoverageProps) {
  return (
    <ul className="mt-6 flex max-w-[60ch] flex-col gap-2.5 border-t border-border/60 pt-4">
      {mentions.map((mention) => (
        <li key={mention.url}>
          <a
            href={mention.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group grid grid-cols-[3.5rem_1fr] items-baseline gap-x-4 text-sm"
          >
            <span
              className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.18em] tabular-nums text-muted-foreground`}
            >
              {mention.publishedDate ? formatShortDate(mention.publishedDate) : "—"}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="flex items-baseline gap-1.5">
                <span
                  className={`${briefProse.className} text-[0.9375rem] leading-[1.4] text-foreground/85 underline-offset-[3px] group-hover:underline group-hover:text-foreground`}
                >
                  {mention.title ?? hostname(mention.url)}
                </span>
                <ArrowUpRight
                  className="h-3 w-3 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden
                />
              </span>
              <span
                className={`${briefDisplay.className} text-[10px] uppercase tracking-[0.14em] text-muted-foreground`}
              >
                <span className={mention.kind === "own_domain" ? "italic" : ""}>
                  {mention.publisher ?? hostname(mention.url)}
                </span>
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

const MONTH_ABBREVS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTH_ABBREVS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
