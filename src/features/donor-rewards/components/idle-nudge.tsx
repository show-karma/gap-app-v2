"use client";

import { Zap } from "lucide-react";
import { motion } from "motion/react";
import pluralize from "pluralize";
import { useRewards } from "../state/rewards-context";
import { formatUsd } from "../utils/format";

interface IdleNudgeProps {
  onOpenGrantFlow: () => void;
}

export function IdleNudge({ onOpenGrantFlow }: IdleNudgeProps) {
  const { state } = useRewards();

  if (state.idleDays === 0) {
    return (
      <section
        aria-label="Funds at work"
        className="flex flex-col justify-between rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40"
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Funds at work
          </h2>
          <p className="mt-3 text-2xl font-bold text-emerald-800 dark:text-emerald-200">
            Nice work! 🎉
          </p>
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
            Your latest grant put your dollars back to work. Nonprofits will report verified
            milestones as your funding lands.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenGrantFlow}
          className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-95"
        >
          Grant again
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Idle funds nudge"
      className="flex flex-col justify-between rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-950/40"
    >
      <div>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            className="rounded-xl bg-amber-100 p-2 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
          >
            <Zap className="h-5 w-5" fill="currentColor" aria-hidden="true" />
          </motion.div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Money resting
          </h2>
        </div>
        <p className="mt-3 text-2xl font-bold text-amber-900 dark:text-amber-100">
          {formatUsd(state.balance)} has been idle for {state.idleDays}{" "}
          {pluralize("day", state.idleDays)}
        </p>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          Even {formatUsd(500)} could fund a month of verified impact. Put a piece of it to work
          today.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenGrantFlow}
        className="mt-4 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600 active:scale-95"
      >
        Put {formatUsd(500)} to work
      </button>
    </section>
  );
}
