"use client";

import { CalendarDaysIcon, DocumentTextIcon, FlagIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import React, { type FC } from "react";
import { ATTENTION_META } from "@/components/Inbox/attentionMeta";
import { AiScore, DueChip, KindTag, StatusBadge } from "@/components/Inbox/InboxBadges";
import { describeFollowUp, stageAgeTone } from "@/components/Inbox/stageAge";
import type { InboxItem } from "@/components/Inbox/types";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

/** Prints a stored calendar day in UTC — see utilities/calendarDay. */
const formatCalendarDay = (iso: string): string => formatDate(iso, "UTC");

/**
 * The stage an admin row sits in, with how long it has been there.
 *
 * The number used to float alone at the far right of the title ("153d"),
 * detached from the badge that gave it meaning. Here the badge and the clock
 * are one phrase — "Past due · 153 days overdue" — so the row says what the
 * number counts. The clock keeps the heat tone; the badge keeps its stage hue.
 */
const StageLine: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason) return null;
  const meta = ATTENTION_META[item.attentionReason];
  const days = item.stageAgeDays;
  const tone = stageAgeTone(days);

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
          meta.badgeClass
        )}
      >
        {meta.label}
      </span>
      {typeof days === "number" && (
        <span className={cn("truncate text-xs font-medium tabular-nums", tone.text)}>
          {days} {pluralize("day", days)} {meta.ageSuffix}
        </span>
      )}
    </span>
  );
};

/**
 * Who and where: applicant email for an application, project for a milestone,
 * then the program. Joined on one dimmed line so the distinguishing half comes
 * first and the repetition costs one line instead of two.
 */
const Provenance: FC<{ item: InboxItem; hideSubtitle: boolean }> = ({ item, hideSubtitle }) => {
  const primary = item.kind === "milestone" ? item.project : item.who;
  const secondary = !hideSubtitle ? item.subtitle : undefined;
  const parts = [primary, secondary].filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
      {parts.join(" · ")}
    </span>
  );
};

/**
 * The next scheduled chase, only when one exists. An unscheduled row says
 * nothing here: the follow-up-ordered list already labels the undated tail,
 * and "No follow-up" on every other row was noise that read like a warning.
 */
const FollowUpSlot: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason || !item.nextFollowUpAt) return null;
  const followUp = describeFollowUp(item.nextFollowUpAt, formatCalendarDay);

  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-1 text-xs", followUp.className)}
      title={`Next follow-up ${followUp.label}`}
    >
      <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {followUp.overdue ? "Follow-up overdue" : `Follow-up ${followUp.shortLabel}`}
      </span>
    </span>
  );
};

/** Submitted + last-updated line for reviewer-scoped application rows. */
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
 * Three lines: a kind glyph and the title, then provenance, then one meta
 * line — stage with its clock, the next follow-up, open notes. Rows are
 * separated by hairlines rather than drawn as bordered cards. Purely
 * presentational — selection state and handling are driven by props.
 */
const InboxListItemComponent: FC<InboxListItemProps> = ({
  item,
  selected,
  onSelect,
  hideKind = false,
  hideSubtitle = false,
}) => {
  const isAdminRow = Boolean(item.attentionReason);
  const openItems = item.openActionItems ?? 0;
  const KindGlyph = item.kind === "application" ? DocumentTextIcon : FlagIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(item.id)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group block h-auto w-full min-w-0 justify-start whitespace-normal rounded-none px-4 py-2.5 text-left focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
        selected
          ? "bg-primary-50 hover:bg-primary-50 dark:bg-primary-900/20 dark:hover:bg-primary-900/20"
          : "hover:bg-gray-50 dark:hover:bg-zinc-800/60"
      )}
    >
      {!hideKind && !isAdminRow && (
        <span className="mb-1 flex items-center gap-2">
          <KindTag kind={item.kind} />
          <StatusBadge status={item.status} className="ml-auto shrink-0" />
        </span>
      )}

      <span className="flex items-start gap-2">
        {!hideKind && isAdminRow && (
          <KindGlyph
            className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500"
            aria-label={item.kind === "application" ? "Application" : "Milestone"}
          />
        )}
        <span
          className={cn(
            "line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-snug",
            selected ? "text-gray-950 dark:text-white" : "text-gray-900 dark:text-gray-100"
          )}
        >
          {item.title}
        </span>
      </span>

      <Provenance item={item} hideSubtitle={hideSubtitle} />

      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {isAdminRow ? <StageLine item={item} /> : <DueChip item={item} />}

        <FollowUpSlot item={item} />

        {openItems > 0 && (
          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
            {openItems} open {pluralize("note", openItems)}
          </span>
        )}

        {!isAdminRow && <ApplicationDates item={item} />}
        <AiScore score={item.aiScore} className="ml-auto" />
      </span>
    </Button>
  );
};

export const InboxListItem = React.memo(InboxListItemComponent);
InboxListItem.displayName = "InboxListItem";
