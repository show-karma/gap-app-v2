"use client";

import { Target } from "lucide-react";
import pluralize from "pluralize";
import React from "react";
import { useRewards } from "../state/rewards-context";
import { formatUsd } from "../utils/format";

interface GoalRowData {
  id: string;
  label: string;
  progress: number;
  target: number;
  progressLabel: string;
  done: boolean;
}

const GoalRow = React.memo(function GoalRow({ goal }: { goal: GoalRowData }) {
  const percent = Math.min(100, Math.round((goal.progress / goal.target) * 100));

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-3.5 dark:border-stone-700 dark:bg-stone-800">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{goal.label}</p>
        <span
          className={`shrink-0 font-mono text-xs font-bold ${
            goal.done
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-stone-500 dark:text-stone-400"
          }`}
        >
          {goal.done ? "Done! 🎉" : goal.progressLabel}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </li>
  );
});

const CAUSE_TARGET_OPTIONS = [4, 6, 8];
const MONTH_TARGET_OPTIONS = [6, 9, 12];

export function PersonalGoals() {
  const { state, setPersonalGoals } = useRewards();
  const { causesTarget, monthsTarget } = state.personalGoals;

  const goals: GoalRowData[] = [
    {
      id: "dollars",
      label: `Give ${formatUsd(state.annualGoal)} this year`,
      progress: state.grantedThisYear,
      target: state.annualGoal,
      progressLabel: `${formatUsd(state.grantedThisYear)} of ${formatUsd(state.annualGoal)}`,
      done: state.grantedThisYear >= state.annualGoal,
    },
    {
      id: "causes",
      label: `Support ${causesTarget} ${pluralize("cause", causesTarget)}`,
      progress: state.causesSupported.length,
      target: causesTarget,
      progressLabel: `${state.causesSupported.length}/${causesTarget}`,
      done: state.causesSupported.length >= causesTarget,
    },
    {
      id: "months",
      label: `Give ${monthsTarget} ${pluralize("month", monthsTarget)} in a row`,
      progress: state.streakMonths,
      target: monthsTarget,
      progressLabel: `${state.streakMonths}/${monthsTarget}`,
      done: state.streakMonths >= monthsTarget,
    },
  ];

  return (
    <section
      aria-label="Personal goals"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-center gap-2.5">
        <Target className="h-5 w-5 text-emerald-700 dark:text-emerald-500" aria-hidden="true" />
        <h2 className="[font-family:var(--font-display)] text-xl font-medium text-stone-900 dark:text-white">
          My goals
        </h2>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} />
        ))}
      </ul>

      {/* Target controls stay inline and always visible, so setting a goal is a
          single tap with no hidden panel to expand. */}
      <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Causes to support
          </p>
          <div className="flex gap-1.5">
            {CAUSE_TARGET_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={causesTarget === option}
                onClick={() => setPersonalGoals({ causesTarget: option })}
                className={`w-10 rounded-lg border-2 py-1 font-mono text-sm font-bold transition active:scale-95 ${
                  causesTarget === option
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Streak target</p>
          <div className="flex gap-1.5">
            {MONTH_TARGET_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={monthsTarget === option}
                onClick={() => setPersonalGoals({ monthsTarget: option })}
                className={`w-12 rounded-lg border-2 py-1 font-mono text-sm font-bold transition active:scale-95 ${
                  monthsTarget === option
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                {option}mo
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
