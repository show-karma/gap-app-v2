"use client";

import { Flame } from "lucide-react";
import { motion } from "motion/react";
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
      className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Giving streak
          </h2>
          <div className="mt-2 flex items-baseline gap-2">
            <motion.span
              key={state.streakMonths}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 12 }}
              className="font-mono text-5xl font-bold text-zinc-900 dark:text-white"
            >
              {state.streakMonths}
            </motion.span>
            <span className="text-lg text-zinc-500 dark:text-zinc-400">
              {pluralize("month", state.streakMonths)}
            </span>
          </div>
        </div>
        <motion.div
          animate={
            state.grantedThisMonth
              ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.7 }}
          className={
            state.grantedThisMonth
              ? "rounded-2xl bg-orange-100 p-3 text-orange-500 dark:bg-orange-500/15"
              : "rounded-2xl bg-zinc-100 p-3 text-zinc-400 dark:bg-zinc-800"
          }
        >
          <Flame className="h-8 w-8" fill="currentColor" aria-hidden="true" />
        </motion.div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-1.5">
        {dots.map((dot) => (
          <div key={dot.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-3.5 w-full max-w-8 rounded-full transition-colors ${
                dot.lit
                  ? "bg-orange-400"
                  : dot.current
                    ? "border-2 border-dashed border-orange-300 bg-transparent dark:border-orange-500/50"
                    : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                dot.current ? "text-orange-500" : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {dot.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        {state.grantedThisMonth
          ? `July is locked in. Longest streak: ${state.longestStreak} ${pluralize("month", state.longestStreak)}.`
          : "Make a grant this month to keep your streak alive. A recurring grant protects it automatically."}
      </p>
    </section>
  );
}
