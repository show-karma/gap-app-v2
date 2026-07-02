"use client";

import { useEffect, useState } from "react";
import type { CategoryScore } from "../types";
import { categoryMeta } from "../utils/category-meta";
import {
  BAND_BG,
  BAND_FG,
  BAND_TRACK,
  bandForScore,
  categoryLabel,
  categorySubtitle,
} from "../utils/labels";

interface CategoryBarProps {
  readonly score: CategoryScore;
}

export function CategoryBar({ score }: CategoryBarProps) {
  // Categories with no scoreable checks (e.g. a brand-new rubric tier before
  // any checks are wired) would otherwise render "0 of 0 points", which reads
  // as a failure. Hide them entirely.
  if (score.pointsPossible === 0 && !score.pending) {
    return null;
  }

  const band = bandForScore(score);
  const label = categoryLabel(score);
  const { verb, icon: Icon } = categoryMeta(score.category);
  const subtitle = score.summary ?? categorySubtitle(score);
  const targetPct =
    score.pointsPossible === 0
      ? 0
      : Math.max(0, Math.min(100, (score.pointsAwarded / score.pointsPossible) * 100));

  return (
    <div className="flex flex-col gap-2 border-b border-border py-3.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="h-[17px] w-[17px]" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {verb ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              {verb}
            </span>
          ) : null}
          {score.pending ? (
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              pending
            </span>
          ) : null}
        </div>
        <span className={`text-base font-bold tabular-nums ${BAND_FG[band]}`}>
          {Math.round(targetPct)}%
        </span>
      </div>

      <AnimatedBar targetPct={targetPct} band={band} score={score} label={label} />

      {subtitle ? (
        <p className="pl-12 text-[13.5px] leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

function AnimatedBar({
  targetPct,
  band,
  score,
  label,
}: {
  readonly targetPct: number;
  readonly band: ReturnType<typeof bandForScore>;
  readonly score: CategoryScore;
  readonly label: string;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(targetPct), 80);
    return () => clearTimeout(t);
  }, [targetPct]);

  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full ${BAND_TRACK[band]}`}>
      <progress
        className="absolute inset-0 h-full w-full appearance-none opacity-0"
        value={score.pointsAwarded}
        max={score.pointsPossible || 1}
        aria-label={`${label}: ${score.pointsAwarded} of ${score.pointsPossible} points`}
      />
      <div
        className={`h-full rounded-full ${BAND_BG[band]} transition-[width] duration-[900ms] ease-out`}
        style={{ width: `${width}%` }}
        aria-hidden
      />
    </div>
  );
}
