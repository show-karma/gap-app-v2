import pluralize from "pluralize";
import type { CategoryScore } from "../types";

const GRADE_TONES: Record<string, { bar: string; bg: string }> = {
  high: { bar: "bg-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  mid: { bar: "bg-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  low: { bar: "bg-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30" },
};

function pickTone(awarded: number, possible: number): { bar: string; bg: string } {
  if (possible === 0) {
    return GRADE_TONES.low;
  }
  const ratio = awarded / possible;
  if (ratio >= 0.8) {
    return GRADE_TONES.high;
  }
  if (ratio >= 0.5) {
    return GRADE_TONES.mid;
  }
  return GRADE_TONES.low;
}

interface CategoryBarProps {
  readonly score: CategoryScore;
}

export function CategoryBar({ score }: CategoryBarProps) {
  const tone = pickTone(score.pointsAwarded, score.pointsPossible);
  const widthPct =
    score.pointsPossible === 0
      ? 0
      : Math.max(0, Math.min(100, (score.pointsAwarded / score.pointsPossible) * 100));
  const pointsLabel = `${score.pointsAwarded} of ${score.pointsPossible} ${pluralize(
    "point",
    score.pointsPossible
  )}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {score.category}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{pointsLabel}</span>
      </div>
      <div
        className={`h-2 w-full rounded-full ${tone.bg}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={score.pointsPossible}
        aria-valuenow={score.pointsAwarded}
        aria-label={`${score.category}: ${pointsLabel}`}
      >
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${widthPct}%` }} />
      </div>
      {score.summary ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{score.summary}</p>
      ) : null}
    </div>
  );
}
