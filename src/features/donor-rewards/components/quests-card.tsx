"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { m } from "motion/react";
import pluralize from "pluralize";
import React from "react";
import { useRewards } from "../state/rewards-context";
import type { Quest } from "../types";

const QuestRow = React.memo(function QuestRow({ quest }: { quest: Quest }) {
  const done = quest.progress >= quest.goal;

  return (
    <li
      className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
        done
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
          : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
      }`}
    >
      {done ? (
        <m.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="text-emerald-500"
        >
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </m.span>
      ) : (
        <span className="text-stone-300 dark:text-stone-600">
          <Circle className="h-7 w-7" aria-hidden="true" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={`font-semibold ${
            done
              ? "text-emerald-800 line-through decoration-emerald-400 dark:text-emerald-300"
              : "text-stone-900 dark:text-white"
          }`}
        >
          {quest.title}
        </p>
        <p className="truncate text-sm text-stone-500 dark:text-stone-400">{quest.description}</p>
        {quest.goal > 1 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(quest.progress / quest.goal) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {quest.progress}/{quest.goal}
            </span>
          </div>
        )}
      </div>

      <span
        className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs font-bold ${
          done
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
        }`}
      >
        +{quest.xp} IP
      </span>
    </li>
  );
});

export function QuestsCard() {
  const { state } = useRewards();
  const remaining = state.quests.filter((quest) => quest.progress < quest.goal).length;

  return (
    <section
      aria-label="Monthly quests"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-center justify-between">
        <h2 className="[font-family:var(--font-display)] text-xl font-medium text-stone-900 dark:text-white">
          July quests
        </h2>
        {remaining > 0 ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            {remaining} {pluralize("quest", remaining)} left
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            All complete! 🎉
          </span>
        )}
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {state.quests.map((quest) => (
          <QuestRow key={quest.id} quest={quest} />
        ))}
      </ul>
    </section>
  );
}
