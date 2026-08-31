"use client";

import { Flame } from "lucide-react";
import { m } from "motion/react";
import pluralize from "pluralize";
import { useRewards } from "../state/rewards-context";

const PREVIOUS_MONTHS = ["Feb", "Mar", "Apr", "May", "Jun"];

export function StreakCard() {
  const { state } = useRewards();
  const previousStreak = state.grantedThisMonth ? state.streakMonths - 1 : state.streakMonths;

  const dots = [
    ...PREVIOUS_MONTHS.map((label, index) => ({
      label,
      lit: index >= PREVIOUS_MONTHS.length - Math.min(previousStreak, PREVIOUS_MONTHS.length),
      current: false,
    })),
    { label: "Jul", lit: state.grantedThisMonth, current: true },
  ];

  return (
    <section
      aria-label="Giving streak"
      className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Giving streak
          </h2>
          <div className="mt-2 flex items-baseline gap-2">
            <m.span
              key={state.streakMonths}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 12 }}
              className="font-mono text-5xl font-bold text-stone-900 dark:text-white"
            >
              {state.streakMonths}
            </m.span>
            <span className="text-lg text-stone-500 dark:text-stone-400">
              {pluralize("month", state.streakMonths)}
            </span>
          </div>
        </div>
        <m.div
          animate={
            state.grantedThisMonth
              ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.7 }}
          className={
            state.grantedThisMonth
              ? "rounded-2xl bg-amber-100 p-3 text-amber-500 dark:bg-amber-500/15"
              : "rounded-2xl bg-stone-100 p-3 text-stone-400 dark:bg-stone-800"
          }
        >
          <Flame className="h-8 w-8" fill="currentColor" aria-hidden="true" />
        </m.div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-1.5">
        {dots.map((dot) => (
          <div key={dot.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-3.5 w-full max-w-8 rounded-full transition-colors ${
                dot.lit
                  ? "bg-amber-400"
                  : dot.current
                    ? "border-2 border-dashed border-amber-300 bg-transparent dark:border-amber-500/50"
                    : "bg-stone-200 dark:bg-stone-700"
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                dot.current ? "text-amber-500" : "text-stone-400 dark:text-stone-500"
              }`}
            >
              {dot.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
        {state.grantedThisMonth
          ? `July is locked in. Longest streak: ${state.longestStreak} ${pluralize("month", state.longestStreak)}.`
          : "Make a grant this month to keep your streak alive. A recurring grant protects it automatically."}
      </p>
    </section>
  );
}
