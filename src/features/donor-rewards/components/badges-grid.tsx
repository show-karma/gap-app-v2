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
      className={`flex flex-col items-center gap-2 px-2 py-4 text-center ${
        badge.unlocked ? "" : "opacity-50"
      }`}
      title={badge.description}
    >
      <span
        className={`relative flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
          badge.unlocked
            ? "bg-amber-50 ring-2 ring-amber-400/70 dark:bg-amber-500/10 dark:ring-amber-500/50"
            : "bg-stone-100 grayscale ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700"
        }`}
      >
        {badge.emoji}
        {!badge.unlocked && (
          <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-stone-400 p-1 text-white dark:bg-stone-600">
            <Lock className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
        )}
      </span>
      <span
        className={`text-xs font-semibold leading-tight ${
          badge.unlocked ? "text-stone-900 dark:text-white" : "text-stone-500 dark:text-stone-400"
        }`}
      >
        {badge.name}
      </span>
      <span className="text-[10px] leading-tight text-stone-400 dark:text-stone-500">
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
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-center justify-between">
        <h2 className="[font-family:var(--font-display)] text-xl font-medium text-stone-900 dark:text-white">
          Badges
        </h2>
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
