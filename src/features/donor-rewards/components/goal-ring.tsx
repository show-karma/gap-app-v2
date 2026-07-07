"use client";

import { motion } from "motion/react";
import { useRewards } from "../state/rewards-context";
import { formatUsd } from "../utils/format";

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function GoalRing() {
  const { state } = useRewards();
  const progress = Math.min(1, state.grantedThisYear / state.annualGoal);
  const percent = Math.round(progress * 100);
  const remaining = Math.max(0, state.annualGoal - state.grantedThisYear);

  return (
    <section
      aria-label="Annual giving goal"
      className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        2026 giving goal
      </h2>

      <div className="mt-3 flex flex-1 items-center justify-center gap-6">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 144 144" className="h-full w-full -rotate-90">
            <title>Progress toward annual giving goal</title>
            <circle
              cx="72"
              cy="72"
              r={RADIUS}
              fill="none"
              strokeWidth="14"
              className="stroke-zinc-100 dark:stroke-zinc-800"
            />
            <motion.circle
              cx="72"
              cy="72"
              r={RADIUS}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              className="stroke-emerald-500"
              initial={false}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
              transition={{ type: "spring", stiffness: 50, damping: 15 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-bold text-zinc-900 dark:text-white">
              {percent}%
            </span>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              of {formatUsd(state.annualGoal)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Granted so far</p>
            <p className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatUsd(state.grantedThisYear)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Left to go</p>
            <p className="font-mono text-xl font-bold text-zinc-900 dark:text-white">
              {formatUsd(remaining)}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {percent >= 100
          ? "Goal reached! Consider stretching it for the rest of the year."
          : percent >= 50
            ? "You are ahead of pace for July. Keep it up!"
            : "A grant this month keeps you on pace for the year."}
      </p>
    </section>
  );
}
