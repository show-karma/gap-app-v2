"use client";

import type { ScanGrade } from "../types";
import { BAND_FG, GRADE_BLURB, GRADE_LABEL, gradeBand } from "../utils/labels";
import { GradeBadge } from "./grade-badge";
import { ScoreGauge } from "./score-gauge";

interface ScoreHeroProps {
  readonly totalScore: number | null;
  readonly grade: ScanGrade | null;
  readonly orgName?: string | null;
  readonly url?: string | null;
  readonly scannedAt?: string | null;
  readonly compact?: boolean;
}

// Renders a date deterministically across SSR/CSR. toLocaleString varies by
// server vs client locale and triggers a hydration mismatch.
function formatScanDate(iso: string): string {
  const d = new Date(iso);
  const MONTHS = [
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
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function ScoreHero({ totalScore, grade, orgName, url, scannedAt, compact }: ScoreHeroProps) {
  const band = grade ? gradeBand(grade) : "weak";
  const gaugeSize = compact ? 152 : 184;

  return (
    <header className="flex flex-col gap-6">
      {orgName || url ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {orgName ? (
            <span className="text-base font-medium text-foreground">{orgName}</span>
          ) : null}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          ) : null}
          {scannedAt ? (
            <span className="font-mono text-xs text-muted-foreground">
              scanned {formatScanDate(scannedAt)}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <ScoreGauge score={totalScore ?? 0} grade={grade} size={gaugeSize} />
        <div className="min-w-[220px] flex-1">
          {grade ? (
            <>
              <div className="mb-2.5 flex items-center gap-2.5">
                <GradeBadge grade={grade} size={34} />
                <span
                  className={`text-[13px] font-semibold uppercase tracking-[0.06em] ${BAND_FG[band]}`}
                >
                  {GRADE_LABEL[grade]}
                </span>
              </div>
              <p className="max-w-md text-lg font-normal leading-snug text-foreground-alt">
                {GRADE_BLURB[grade]}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
                aria-hidden
              />
              <span>Computing grade…</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
