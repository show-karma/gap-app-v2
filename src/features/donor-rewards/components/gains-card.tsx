"use client";

import { TrendingUp } from "lucide-react";
import { useRewards } from "../state/rewards-context";
import { formatUsd } from "../utils/format";

interface GainsCardProps {
  onGrantGains: (amount: number) => void;
}

/**
 * Windfall framing (NCFP Barrier 9): people part with windfalls far more
 * easily than with earned or saved money. Investment returns inside the fund
 * are the purest windfall there is, so we surface them with a one-tap path
 * to grant them out while the original balance "stays whole."
 */
export function GainsCard({ onGrantGains }: GainsCardProps) {
  const { state } = useRewards();

  if (state.investmentGains === 0) {
    return (
      <section
        aria-label="Investment gains"
        className="flex flex-col justify-center rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="flex items-center gap-2">
          <TrendingUp
            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">
            Investment gains
          </h2>
        </div>
        <p className="mt-3 [font-family:var(--font-display)] text-2xl font-medium text-stone-900 dark:text-white">
          All gains deployed 🎉
        </p>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Every dollar your investments earned this year is now out working. New gains will show up
          here as your fund grows.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Investment gains"
      className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-950/40"
    >
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-400">
            Investment gains
          </h2>
        </div>
        <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
          +{formatUsd(state.investmentGains)}
        </p>
        <p className="mt-2 text-sm text-amber-800/90 dark:text-amber-300">
          Your fund grew this year while you slept. Grant the gains and your original balance stays
          whole.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onGrantGains(state.investmentGains)}
        className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-amber-950 transition hover:bg-amber-400 active:scale-95"
      >
        Grant it out
      </button>
    </section>
  );
}
