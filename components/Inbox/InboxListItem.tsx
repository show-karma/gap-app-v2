"use client";

import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import React, { type FC } from "react";
import { ATTENTION_META, STAGE_AGE_LABEL } from "@/components/Inbox/attentionMeta";
import { AiScore, DueChip, KindTag, StatusBadge } from "@/components/Inbox/InboxBadges";
import { describeFollowUp, stageAgeTone } from "@/components/Inbox/stageAge";
import type { InboxItem } from "@/components/Inbox/types";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

/** Prints a stored calendar day in UTC — see utilities/calendarDay. */
const formatCalendarDay = (iso: string): string => formatDate(iso, "UTC");

/**
 * Time in the current stage — the one loud element on an admin row.
 *
 * Everything else on the row is deliberately quiet so this reads first. The
 * stage is already named by the badge, so only the number belongs here; the
 * title attribute carries the stage back for anyone who needs it, since "379d"
 * alone does not say 379 days of what.
 */
const StageAge: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason || typeof item.stageAgeDays !== "number") return null;
  const tone = stageAgeTone(item.stageAgeDays);

  return (
    <span
      className={cn("shrink-0 text-sm font-semibold tabular-nums", tone.text)}
      title={`${item.stageAgeDays} ${pluralize("day", item.stageAgeDays)} ${
        STAGE_AGE_LABEL[item.attentionReason]
      }`}
    >
      {item.stageAgeDays}d
    </span>
  );
};

/**
 * Project and program on one dimmed line.
 *
 * These were two stacked lines, and the program repeated verbatim on nearly
 * every row ("Filecoin ProPGF Batch 1" four times running). Joined and
 * truncated, the distinguishing half comes first and the repetition costs one
 * line instead of two.
 */
const Provenance: FC<{ item: InboxItem; hideSubtitle: boolean }> = ({ item, hideSubtitle }) => {
  const primary = item.kind === "milestone" ? item.project : item.who;
  const secondary = item.kind === "milestone" && !hideSubtitle ? item.subtitle : undefined;
  const parts = [primary, secondary].filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
      {parts.join(" · ")}
    </span>
  );
};

/**
 * The follow-up date, on every admin row.
 *
 * The queue can be ordered by this date, so hiding it when it is merely "not
 * overdue" left the reader with an order they could not verify. Only the
 * relative phrase renders here — on a date-ordered queue the absolute date is
 * near-identical down the column and separates nothing.
 */
const FollowUpSlot: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason) return null;
  const followUp = describeFollowUp(item.nextFollowUpAt, formatCalendarDay);

  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-1 text-xs", followUp.className)}
      title={followUp.scheduled ? `Next follow-up ${followUp.label}` : "No follow-up scheduled"}
    >
      <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{followUp.shortLabel}</span>
    </span>
  );
};

/** Submitted + last-updated line for application rows. */
const ApplicationDates: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.submittedAt && !item.updatedAt) return null;
  return (
    <span className="truncate text-xs text-gray-500 dark:text-zinc-400">
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
  /**
   * Fields the list has determined carry the same value on EVERY visible row
   * (e.g. every row is a milestone, every row is the same program). A constant
   * costs a line of scanning on every row and distinguishes nothing, so the
   * list suppresses it. See InboxList.
   */
  hideKind?: boolean;
  hideSubtitle?: boolean;
}

/**
 * Master-list row in the Reviewer Inbox.
 *
 * Three lines, not five: title + days stuck, then provenance, then a meta line
 * carrying the stage badge, the follow-up and the open-item count. Rows are
 * separated by hairlines rather than drawn as bordered cards — at 25 rows the
 * card chrome cost more vertical space than the content it framed.
 *
 * Purely presentational — selection state and handling are driven by props.
 */
const InboxListItemComponent: FC<InboxListItemProps> = ({
  item,
  selected,
  onSelect,
  hideKind = false,
  hideSubtitle = false,
}) => {
  const isAdminRow = Boolean(item.attentionReason);
  const heat = stageAgeTone(item.stageAgeDays);
  const openItems = item.openActionItems ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group relative block w-full py-2.5 pl-4 pr-3 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
        selected
          ? "bg-primary-50 dark:bg-primary-900/20"
          : "hover:bg-gray-50 dark:hover:bg-zinc-800/60"
      )}
    >
      {isAdminRow && (
        <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", heat.bar)} />
      )}

      {!hideKind && (
        <span className="mb-1 flex items-center gap-2">
          <KindTag kind={item.kind} />
          {!isAdminRow && <StatusBadge status={item.status} className="ml-auto shrink-0" />}
        </span>
      )}

      <span className="flex items-baseline gap-2">
        <span
          className={cn(
            "line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-snug",
            selected ? "text-gray-950 dark:text-white" : "text-gray-900 dark:text-gray-100"
          )}
        >
          {item.title}
        </span>
        <StageAge item={item} />
      </span>

      <Provenance item={item} hideSubtitle={hideSubtitle} />

      <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {isAdminRow && item.attentionReason ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
              ATTENTION_META[item.attentionReason].badgeClass
            )}
          >
            {ATTENTION_META[item.attentionReason].label}
          </span>
        ) : (
          <DueChip item={item} />
        )}

        <FollowUpSlot item={item} />

        {openItems > 0 && (
          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
            {openItems} open {pluralize("item", openItems)}
          </span>
        )}

        {!isAdminRow && <ApplicationDates item={item} />}
        <AiScore score={item.aiScore} className="ml-auto" />
      </span>
    </button>
  );
};

export const InboxListItem = React.memo(InboxListItemComponent);
InboxListItem.displayName = "InboxListItem";
