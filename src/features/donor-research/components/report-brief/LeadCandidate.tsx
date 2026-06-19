"use client";

import { ArrowUpRight } from "lucide-react";
import type { ResearchReportCandidate } from "@/types/donor-research";
import { SocialPresence } from "../report-viewer/SocialPresence";
import { ChapterMark } from "./ChapterMark";
import { ComplianceStrip } from "./ComplianceStrip";
import { FinancialsTable } from "./FinancialsTable";
import { briefDisplay, briefProse } from "./fonts";
import { ScoreBreakdownTable } from "./ScoreBreakdownTable";
import { compositeBand, leadJustification } from "./scoring";
import {
  formatEin,
  formatLocale,
  hostname,
  humanizeCase,
  mostRecentMentionDate,
  relativeDays,
} from "./text-utils";

interface LeadCandidateProps {
  candidate: ResearchReportCandidate;
}

/**
 * The lead recommendation. Rendered as a two-column editorial
 * spread: identity + prose on the left, "by the numbers" sidebar
 * on the right. The composite number is the only large piece of
 * brand-coloured type on the page — everything else relies on
 * scale and weight for hierarchy.
 */
export function LeadCandidate({ candidate }: LeadCandidateProps) {
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
  const pullQuote = candidate.reasoningSummary?.trim() ?? null;
  const composite100 = Math.round(candidate.composite * 100);
  const band = compositeBand(candidate.composite, isDisqualified);
  const recent = candidate.recentMentions ?? [];
  const mostRecentMs = mostRecentMentionDate(recent);
  const mostRecentLabel = relativeDays(mostRecentMs);

  return (
    <section className="mb-24 sm:mb-32">
      <ChapterMark number="01" label="Lead" tone="lead" />

      <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-10 lg:mt-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0">
          <CandidateIdentity
            name={name}
            locale={locale}
            ein={candidate.ein}
            websiteUrl={candidate.organizationWebsiteUrl}
            displayDecisive
          />

          {description ? (
            <p
              className={`${briefProse.className} mt-6 max-w-[58ch] text-[1.0625rem] leading-[1.55] text-foreground/85`}
            >
              {description}
            </p>
          ) : null}

          {body.paragraphs.length > 0 ? (
            <div className="mt-6 flex flex-col gap-4">
              {body.paragraphs.map((para) => (
                <p
                  key={para.slice(0, 48)}
                  className={`${briefProse.className} max-w-[58ch] text-[1.0625rem] leading-[1.6] text-foreground/85`}
                >
                  {para}
                </p>
              ))}
            </div>
          ) : null}

          {pullQuote ? (
            <blockquote className="relative mt-8 max-w-[52ch] border-t border-border/70 pt-5">
              <span
                aria-hidden
                className={`${briefDisplay.className} absolute -top-[0.55em] left-0 bg-background px-2 text-[10px] font-medium uppercase tracking-[0.32em] text-brand-emphasis dark:text-brand-subtle`}
                style={{ marginLeft: "-0.5rem" }}
              >
                ✦ Our take
              </span>
              <p
                className={`${briefProse.className} text-[1.125rem] italic leading-[1.55] text-foreground/90`}
              >
                {pullQuote}
              </p>
            </blockquote>
          ) : null}

          <FinancialsTable financials={candidate.financials} />

          {recent.length > 0 ? <LeadCoverage candidate={candidate} /> : null}

          <SocialPresence metrics={candidate.socialMetrics} />
        </div>

        <aside className="min-w-0 lg:pl-8 lg:border-l lg:border-border/60">
          <CompositeHero composite100={composite100} band={band} disqualified={isDisqualified} />

          <ScoreBreakdownTable candidate={candidate} />

          <ComplianceStrip candidate={candidate} />

          {mostRecentLabel ? (
            <div className="mt-7 flex items-baseline justify-between border-t border-border/60 pt-4">
              <span
                className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground`}
              >
                Last mention
              </span>
              <span className={`${briefDisplay.className} text-sm text-foreground`}>
                {mostRecentLabel}
              </span>
            </div>
          ) : null}
        </aside>
      </div>

      <LeadJustification candidate={candidate} />
    </section>
  );
}

interface CandidateIdentityProps {
  name: string;
  locale: string | null;
  ein: string | null;
  websiteUrl: string | null;
  displayDecisive: boolean;
}

function CandidateIdentity({
  name,
  locale,
  ein,
  websiteUrl,
  displayDecisive,
}: CandidateIdentityProps) {
  const eyebrowSize = displayDecisive ? "text-[11px]" : "text-[10px]";
  return (
    <header>
      <p
        className={`${briefDisplay.className} ${eyebrowSize} font-medium uppercase tracking-[0.28em] text-muted-foreground`}
      >
        The lead recommendation
      </p>
      <h2
        className={`${briefDisplay.className} mt-3 text-balance text-[clamp(1.75rem,3.6vw,2.625rem)] font-medium leading-[1.05] tracking-[-0.02em] text-foreground`}
      >
        {name}
      </h2>
      <div
        className={`${briefDisplay.className} mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs`}
      >
        {locale ? (
          <span className="font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {locale}
          </span>
        ) : null}
        {ein ? (
          <span className="tabular-nums text-muted-foreground/80">EIN {formatEin(ein)}</span>
        ) : null}
        {websiteUrl ? (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-brand-emphasis underline-offset-[3px] hover:underline dark:text-brand-subtle"
          >
            {hostname(websiteUrl)}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </header>
  );
}

interface CompositeHeroProps {
  composite100: number;
  band: string;
  disqualified: boolean;
}

function CompositeHero({ composite100, band, disqualified }: CompositeHeroProps) {
  const numberTone = disqualified
    ? "text-muted-foreground"
    : "text-brand-emphasis dark:text-brand-subtle";
  return (
    <div>
      <p
        className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
      >
        Composite match
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`${briefDisplay.className} text-[clamp(3.25rem,7vw,4.5rem)] font-light leading-[0.85] tabular-nums tracking-[-0.04em] ${numberTone}`}
        >
          {composite100}
        </span>
        <span
          className={`${briefDisplay.className} text-2xl font-light leading-none tabular-nums text-muted-foreground`}
        >
          /100
        </span>
      </div>
      <p className={`${briefDisplay.className} mt-2 text-sm font-medium text-foreground/80`}>
        {band}
      </p>
    </div>
  );
}

interface LeadCoverageProps {
  candidate: ResearchReportCandidate;
}

function LeadCoverage({ candidate }: LeadCoverageProps) {
  const mentions = (candidate.recentMentions ?? []).slice(0, 4);
  if (mentions.length === 0) return null;
  return (
    <section className="mt-10 max-w-[58ch] border-t border-border/60 pt-5">
      <p
        className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
      >
        Recent coverage
      </p>
      <ol className="mt-4 flex flex-col gap-3.5">
        {mentions.map((mention, i) => (
          <li key={mention.url} className="grid grid-cols-[2.25rem_1fr] items-baseline gap-x-4">
            <span
              className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.18em] tabular-nums text-brand-emphasis dark:text-brand-subtle`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <a
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-0.5"
            >
              <span className="flex items-baseline gap-1.5">
                <span
                  className={`${briefProse.className} text-[1.0625rem] leading-[1.4] text-foreground/90 underline-offset-[3px] group-hover:underline group-hover:text-foreground`}
                >
                  {mention.title ?? hostname(mention.url)}
                </span>
                <ArrowUpRight
                  className="h-3 w-3 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden
                />
              </span>
              <span
                className={`${briefDisplay.className} text-[11px] uppercase tracking-[0.14em] text-muted-foreground`}
              >
                <span className={mention.kind === "own_domain" ? "italic" : ""}>
                  {mention.publisher ?? hostname(mention.url)}
                </span>
                {mention.publishedDate ? (
                  <>
                    <span aria-hidden className="mx-1.5">
                      ·
                    </span>
                    <span className="tabular-nums">{formatShortDate(mention.publishedDate)}</span>
                  </>
                ) : null}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LeadJustification({ candidate }: LeadCandidateProps) {
  return (
    <div className="mt-12 border-t border-border/60 pt-6">
      <p
        className={`${briefDisplay.className} max-w-[72ch] text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
      >
        Why this leads
      </p>
      <p
        className={`${briefProse.className} mt-2 max-w-[72ch] text-[1rem] leading-[1.55] text-foreground/80`}
      >
        This recommendation leads the pool on{" "}
        <span className="text-foreground">{leadJustification(candidate)}</span> Read on for the
        runners-up and the full comparison.
      </p>
    </div>
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
