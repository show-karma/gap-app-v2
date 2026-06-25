import type { ScanGrade } from "../types";

const GRADE_TONE: Record<ScanGrade, string> = {
  A: "bg-emerald-500 text-emerald-50 ring-emerald-300",
  B: "bg-lime-500 text-lime-50 ring-lime-300",
  C: "bg-amber-500 text-amber-50 ring-amber-300",
  D: "bg-orange-500 text-orange-50 ring-orange-300",
  F: "bg-rose-500 text-rose-50 ring-rose-300",
};

const GRADE_LABEL: Record<ScanGrade, string> = {
  A: "AI-ready",
  B: "Mostly ready",
  C: "Partially ready",
  D: "Significant gaps",
  F: "Not AI-ready",
};

interface GradeHeadlineProps {
  readonly grade: ScanGrade | null;
  readonly totalScore: number | null;
  readonly orgName: string | null;
}

export function GradeHeadline({ grade, totalScore, orgName }: GradeHeadlineProps) {
  if (!grade || totalScore === null) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Scan in progress. The grade will appear here once the config-tier checks finish.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl font-bold ring-4 ${GRADE_TONE[grade]}`}
      >
        <span className="sr-only">Grade </span>
        {grade}
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          {totalScore} / 100
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {GRADE_LABEL[grade]}
          {orgName ? ` for ${orgName}` : ""}
        </span>
      </div>
    </div>
  );
}
