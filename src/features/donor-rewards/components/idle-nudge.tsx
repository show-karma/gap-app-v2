"use client";

import { Zap } from "lucide-react";
import { m } from "motion/react";
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
        className="flex flex-col justify-between rounded-2xl bg-emerald-950 p-6 text-white shadow-sm dark:bg-emerald-950"
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300/80">
            Funds at work
          </h2>
          <p className="mt-3 [font-family:var(--font-display)] text-2xl font-medium leading-snug">
            Nice work! 🎉
          </p>
          <p className="mt-2 text-sm text-emerald-200/80">
            Your latest grant put your dollars back to work. Nonprofits will report verified
            milestones as your funding lands.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenGrantFlow}
          className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50 active:scale-95"
        >
          Grant again
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Idle funds nudge"
      className="flex flex-col justify-between rounded-2xl bg-emerald-950 p-6 text-white shadow-sm dark:bg-emerald-950"
    >
      <div>
        <div className="flex items-center gap-2">
          <m.span
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            className="text-amber-400"
          >
            <Zap className="h-4 w-4" fill="currentColor" aria-hidden="true" />
          </m.span>
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300/80">
            Money resting
          </h2>
        </div>
        <p className="mt-3 [font-family:var(--font-display)] text-2xl font-medium leading-snug">
          {formatUsd(state.balance)} has been idle for {state.idleDays}{" "}
          {pluralize("day", state.idleDays)}.
        </p>
        <p className="mt-2 text-sm text-emerald-200/80">
          Even {formatUsd(500)} could fund a month of verified impact.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenGrantFlow}
        className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50 active:scale-95"
      >
        Put {formatUsd(500)} to work
      </button>
    </section>
  );
}
