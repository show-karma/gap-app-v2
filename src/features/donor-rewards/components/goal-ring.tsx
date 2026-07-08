"use client";

import { m } from "motion/react";
import { useRewards } from "../state/rewards-context";
import { formatUsd } from "../utils/format";

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Payout-rate presets for the plan-to-give goal editor, anchored on peer norms. */
const GOAL_RATE_PRESETS = [8, 10, 15];

function goalAmountForRate(balance: number, granted: number, rate: number): number {
  // Goals are set against total fund capital for the year (already granted +
  // remaining balance), rounded to a clean number.
  return Math.round(((balance + granted) * rate) / 100 / 500) * 500;
}

export function GoalRing() {
  const { state, setAnnualGoal } = useRewards();
  const progress = Math.min(1, state.grantedThisYear / state.annualGoal);
  const percent = Math.round(progress * 100);
  const remaining = Math.max(0, state.annualGoal - state.grantedThisYear);

  return (
    <section
      aria-label="Annual giving goal"
      className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        2026 giving goal
      </h2>

      {/* Plan-to-give control is always visible: donors set the goal as a share
          of the fund with a single tap, anchored on the peer-norm range. */}
      <div className="mt-3">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Set your goal as a share of your fund. Donors like you target 8-15% per year.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {GOAL_RATE_PRESETS.map((rate) => {
            const amount = goalAmountForRate(state.balance, state.grantedThisYear, rate);
            const selected = state.annualGoal === amount;
            return (
              <button
                key={rate}
                type="button"
                aria-pressed={selected}
                onClick={() => setAnnualGoal(amount)}
                className={`rounded-xl border-2 px-2 py-2 text-center transition active:scale-95 ${
                  selected
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50"
                    : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800"
                }`}
              >
                <span className="block font-mono text-sm font-bold text-stone-900 dark:text-white">
                  {rate}%
                </span>
                <span className="block text-[10px] text-stone-500 dark:text-stone-400">
                  {formatUsd(amount)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-1 items-center justify-center gap-6">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 144 144" className="h-full w-full -rotate-90">
            <title>Progress toward annual giving goal</title>
            <circle
              cx="72"
              cy="72"
              r={RADIUS}
              fill="none"
              strokeWidth="14"
              className="stroke-stone-100 dark:stroke-stone-800"
            />
            <m.circle
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
            <span className="font-mono text-3xl font-bold text-stone-900 dark:text-white">
              {percent}%
            </span>
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
              of {formatUsd(state.annualGoal)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400">Granted so far</p>
            <p className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatUsd(state.grantedThisYear)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400">Left to go</p>
            <p className="font-mono text-xl font-bold text-stone-900 dark:text-white">
              {formatUsd(remaining)}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        {percent >= 100
          ? "Goal reached! Consider stretching it for the rest of the year."
          : percent >= 50
            ? "You are ahead of pace for July. Keep it up!"
            : "A grant this month keeps you on pace for the year."}
      </p>
    </section>
  );
}
