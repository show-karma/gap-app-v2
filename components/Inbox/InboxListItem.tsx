"use client";

import React, { type FC } from "react";
import { AiScore, DueChip, KindTag, StatusBadge } from "@/components/Inbox/InboxBadges";
import type { InboxItem } from "@/components/Inbox/types";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

/** Submitted + last-updated line for application rows. */
const ApplicationDates: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.submittedAt && !item.updatedAt) return null;
  return (
    <span className="truncate text-[11px] text-gray-400 dark:text-zinc-500">
      {item.submittedAt && `Submitted ${formatDate(item.submittedAt)}`}
      {item.submittedAt && item.updatedAt && " · "}
      {item.updatedAt && `Updated ${formatDate(item.updatedAt)}`}
    </span>
  );
};

interface InboxListItemProps {
  item: InboxItem;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * Master-list row in the Reviewer Inbox. Shows the kind tag, status badge,
 * title, who/project line, a due chip (milestones only) and the AI score.
 * Purely presentational — selection state and handling are driven by props.
 */
const InboxListItemComponent: FC<InboxListItemProps> = ({ item, selected, onSelect }) => {
  const secondary = item.kind === "milestone" ? item.project : item.who;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-pressed={selected}
      className={cn(
        "group w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
        selected
          ? "border-brand-blue bg-blue-50/70 shadow-sm dark:border-brand-blue dark:bg-blue-950/20"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/70"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <KindTag kind={item.kind} />
        <StatusBadge status={item.status} className="shrink-0" />
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900 dark:text-white">
        {item.title}
      </h3>

      {secondary && (
        <p className="mt-1.5 truncate text-xs text-gray-500 dark:text-gray-400">{secondary}</p>
      )}

      {item.kind === "milestone" && item.subtitle && (
        <p className="mt-1.5 truncate text-xs text-gray-400 dark:text-zinc-500">{item.subtitle}</p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {item.kind === "milestone" ? <DueChip item={item} /> : <ApplicationDates item={item} />}
        <AiScore score={item.aiScore} className="ml-auto" />
      </div>
    </button>
  );
};

export const InboxListItem = React.memo(InboxListItemComponent);
InboxListItem.displayName = "InboxListItem";
