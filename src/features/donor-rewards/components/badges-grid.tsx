"use client";

import { Lock } from "lucide-react";
import { m } from "motion/react";
import pluralize from "pluralize";
import React from "react";
import { useRewards } from "../state/rewards-context";
import type { BadgeDef } from "../types";

const BadgeTile = React.memo(function BadgeTile({ badge }: { badge: BadgeDef }) {
  return (
    <m.li
      layout
      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center ${
        badge.unlocked
          ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
          : "border-zinc-200 bg-zinc-50 opacity-70 dark:border-zinc-800 dark:bg-zinc-900"
      }`}
      title={badge.description}
    >
      <span
        className={`relative flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
          badge.unlocked
            ? "bg-amber-100 dark:bg-amber-500/15"
            : "bg-zinc-200 grayscale dark:bg-zinc-800"
        }`}
      >
        {badge.emoji}
        {!badge.unlocked && (
          <span className="absolute -bottom-1 -right-1 rounded-full bg-zinc-500 p-1 text-white dark:bg-zinc-600">
            <Lock className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
        )}
      </span>
      <span
        className={`text-xs font-bold leading-tight ${
          badge.unlocked ? "text-amber-800 dark:text-amber-300" : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {badge.name}
      </span>
      <span className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
        {badge.description}
      </span>
    </m.li>
  );
});

export function BadgesGrid() {
  const { state } = useRewards();
  const unlockedCount = state.badges.filter((badge) => badge.unlocked).length;

  return (
    <section
      aria-label="Badges"
      className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Badges</h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          {unlockedCount} of {state.badges.length} {pluralize("badge", state.badges.length)}
        </span>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {state.badges.map((badge) => (
          <BadgeTile key={badge.id} badge={badge} />
        ))}
      </ul>
    </section>
  );
}
