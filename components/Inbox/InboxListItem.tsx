"use client";

import pluralize from "pluralize";
import React, { type FC } from "react";
import { STAGE_AGE_LABEL } from "@/components/Inbox/attentionMeta";
import { AiScore, DueChip, KindTag, StatusBadge } from "@/components/Inbox/InboxBadges";
import type { InboxItem } from "@/components/Inbox/types";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

/**
 * How long this milestone has been stuck in its current stage. The stage
 * itself is already shown by the status badge, so only the age is rendered.
 * Renders nothing for reviewer-scoped items, which carry no attention reason.
 */
const AttentionLine: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason || typeof item.stageAgeDays !== "number") return null;

  return (
    <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
      <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">
        {item.stageAgeDays}d
      </span>{" "}
      {STAGE_AGE_LABEL[item.attentionReason]}
    </p>
  );
};

/**
 * Follow-up state from the admin action-item log. Surfaces an overdue
 * follow-up prominently — a chase date nobody is reminded of is inert.
 */
const FollowUpLine: FC<{ item: InboxItem }> = ({ item }) => {
  const openCount = item.openActionItems ?? 0;
  if (openCount === 0 && !item.followUpOverdue) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      {openCount > 0 && (
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {openCount} open {pluralize("action item", openCount)}
        </span>
      )}
      {item.followUpOverdue && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
          Follow-up overdue
          {/* Calendar day stored as UTC midnight — see MilestoneActionItems. */}
          {item.nextFollowUpAt ? ` · ${formatDate(item.nextFollowUpAt, "UTC")}` : ""}
        </span>
      )}
    </div>
  );
};

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

      <AttentionLine item={item} />
      <FollowUpLine item={item} />

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {item.kind === "milestone" ? <DueChip item={item} /> : <ApplicationDates item={item} />}
        <AiScore score={item.aiScore} className="ml-auto" />
      </div>
    </button>
  );
};

export const InboxListItem = React.memo(InboxListItemComponent);
InboxListItem.displayName = "InboxListItem";
