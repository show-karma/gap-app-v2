"use client";

import { Sparkles, Wallet } from "lucide-react";
import { m } from "motion/react";
import { useRewards } from "../state/rewards-context";
import { formatNumber, formatUsd } from "../utils/format";
import { levelForXp, nextLevelForXp } from "../utils/levels";

interface RewardsHeaderProps {
  onOpenGrantFlow: () => void;
  onOpenRecap: () => void;
}

export function RewardsHeader({ onOpenGrantFlow, onOpenRecap }: RewardsHeaderProps) {
  const { state } = useRewards();
  const level = levelForXp(state.xp);
  const nextLevel = nextLevelForXp(state.xp);
  const progressToNext = nextLevel
    ? Math.min(100, ((state.xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100)
    : 100;

  return (
    <header className="w-full rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-950 to-emerald-950 p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-3xl">
            🦉
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300/80">
              Good morning, Maya
            </p>
            <h1 className="[font-family:var(--font-display)] text-3xl font-medium italic tracking-tight sm:text-4xl">
              Your giving, at work
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {level.name}
              </span>
              <span className="font-mono text-sm text-emerald-200/90">
                {formatNumber(state.xp)} Impact Points
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Impact deployed leads; the balance is secondary. Framing activity as
              cumulative impact generated, not a shrinking balance (ideas42). */}
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
            <Wallet className="h-5 w-5 text-emerald-300/80" aria-hidden="true" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">
                Impact deployed
              </p>
              <p className="font-mono text-xl font-bold tracking-tight">
                {formatUsd(state.lifetimeGranted)}
              </p>
              <p className="text-[10px] text-emerald-200/70">
                {state.verifiedMilestones} verified milestones · {formatUsd(state.balance)} ready to
                deploy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenGrantFlow}
            className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-emerald-800 shadow-md transition hover:bg-emerald-50 active:scale-95"
          >
            Make a grant
          </button>
          <button
            type="button"
            onClick={onOpenRecap}
            className="rounded-2xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 active:scale-95"
          >
            Year in Giving
          </button>
        </div>
      </div>

      {nextLevel ? (
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-emerald-100">
            <span>
              {level.name} · {formatNumber(state.xp)} IP
            </span>
            <span>
              {formatNumber(nextLevel.minXp - state.xp)} IP to {nextLevel.name}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <m.div
              className="h-full rounded-full bg-amber-400"
              initial={false}
              animate={{ width: `${progressToNext}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm font-medium text-emerald-100">
          You have reached the highest level. Thank you for your extraordinary generosity.
        </p>
      )}
    </header>
  );
}
