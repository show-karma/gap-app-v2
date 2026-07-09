"use client";

import { BadgeCheck, BookOpenCheck } from "lucide-react";
import React, { useMemo } from "react";
import { questsCompletedByRead } from "../state/quest-logic";
import { useRewards } from "../state/rewards-context";
import type { ImpactUpdate, Quest } from "../types";

// Stable empty reference so memoized cards that get no pending bonus don't
// re-render on every parent render.
const NO_PENDING_QUESTS: Quest[] = [];

const UpdateCard = React.memo(function UpdateCard({
  update,
  onRead,
  pendingQuests,
}: {
  update: ImpactUpdate;
  onRead: (id: string) => void;
  /** Quests the next read completes — their XP is credited on top of the update's own */
  pendingQuests: Quest[];
}) {
  const pendingBonus = pendingQuests.reduce((sum, quest) => sum + quest.xp, 0);
  return (
    <li className="py-5 first:pt-4 last:pb-0">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl dark:bg-stone-800">
          {update.orgEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-stone-900 dark:text-white">
              {update.orgName}
            </span>
            {update.verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                Verified on Karma
              </span>
            )}
            <span className="text-xs text-stone-400 dark:text-stone-500">{update.postedAgo}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-stone-800 dark:text-stone-200">
            {update.title}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{update.detail}</p>
          <div className="mt-3">
            {update.read ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                Read · +{update.xpAwarded ?? update.xp} IP earned
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onRead(update.id)}
                  className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-stone-700 active:scale-95 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
                >
                  Mark as read · +{update.xp + pendingBonus} IP
                </button>
                {pendingQuests.map((quest) => (
                  <p
                    key={quest.id}
                    className="mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"
                  >
                    Completes quest "{quest.title}" · +{quest.xp} IP included
                  </p>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
});

export function ImpactFeed() {
  const { state, readUpdate } = useRewards();
  const pendingQuests = useMemo(() => questsCompletedByRead(state.quests), [state.quests]);
  // A read quest completes on the *next* read, whichever update that is, and it
  // pays out only once. Advertise the bonus on just the first unread card so
  // the feed never promises the same one-time quest reward on several cards at
  // once (which would over-count what reading them all actually earns).
  const firstUnreadId = useMemo(
    () => state.updates.find((update) => !update.read)?.id,
    [state.updates]
  );

  return (
    <section
      aria-label="Impact feed"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="[font-family:var(--font-display)] text-xl font-medium text-stone-900 dark:text-white">
        Your impact feed
      </h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Milestone updates from your grantees, verified through Karma's accountability protocol.
      </p>
      {state.updates.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center dark:border-stone-700 dark:bg-stone-900">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">No updates yet</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Make a grant and your grantees' verified milestones will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
          {state.updates.map((update) => (
            <UpdateCard
              key={update.id}
              update={update}
              onRead={readUpdate}
              pendingQuests={update.id === firstUnreadId ? pendingQuests : NO_PENDING_QUESTS}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
