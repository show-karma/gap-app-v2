import type { CategoryScore } from "../types";
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
  // Categories with no scoreable checks (e.g. a brand-new rubric tier
  // before any checks are wired) would otherwise render "0 of 0 points"
  // which reads as a failure. Hide them entirely.
  if (score.pointsPossible === 0 && !score.pending) {
    return null;
  }
  const band = bandForScore(score);
  const label = categoryLabel(score);
  const subtitle = score.summary ?? categorySubtitle(score);
  const widthPct =
    score.pointsPossible === 0
      ? 0
      : Math.max(0, Math.min(100, (score.pointsAwarded / score.pointsPossible) * 100));
  const fmt = (v: number): string =>
    Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
          {score.pending ? (
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              pending
            </span>
          ) : null}
        </div>
        <span className={`font-mono text-xs tabular-nums ${BAND_FG[band]}`}>
          {fmt(score.pointsAwarded)}
          <span className="text-zinc-400 dark:text-zinc-500"> / {fmt(score.pointsPossible)}</span>
        </span>
      </div>
      <div className={`relative h-1.5 w-full overflow-hidden rounded-full ${BAND_TRACK[band]}`}>
        <progress
          className="absolute inset-0 h-full w-full appearance-none opacity-0"
          value={score.pointsAwarded}
          max={score.pointsPossible || 1}
          aria-label={`${label}: ${score.pointsAwarded} of ${score.pointsPossible} points`}
        />
        <div
          className={`h-full ${BAND_BG[band]} transition-[width] duration-700 ease-out`}
          style={{ width: `${widthPct}%` }}
          aria-hidden
        />
      </div>
      {subtitle ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p> : null}
    </div>
  );
}
