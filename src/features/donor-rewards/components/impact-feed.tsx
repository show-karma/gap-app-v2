"use client";

import { BadgeCheck, BookOpenCheck } from "lucide-react";
import React from "react";
import { useRewards } from "../state/rewards-context";
import type { ImpactUpdate } from "../types";

const UpdateCard = React.memo(function UpdateCard({
  update,
  onRead,
}: {
  update: ImpactUpdate;
  onRead: (id: string) => void;
}) {
  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xl dark:bg-zinc-800">
          {update.orgEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              {update.orgName}
            </span>
            {update.verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                Verified on Karma
              </span>
            )}
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{update.postedAgo}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {update.title}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{update.detail}</p>
          <div className="mt-3">
            {update.read ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                Read · +{update.xp} IP earned
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onRead(update.id)}
                className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-700 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Mark as read · +{update.xp} IP
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
});

export function ImpactFeed() {
  const { state, readUpdate } = useRewards();

  return (
    <section
      aria-label="Impact feed"
      className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Your impact feed</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Milestone updates from your grantees, verified through Karma's accountability protocol.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {state.updates.map((update) => (
          <UpdateCard key={update.id} update={update} onRead={readUpdate} />
        ))}
      </ul>
    </section>
  );
}
