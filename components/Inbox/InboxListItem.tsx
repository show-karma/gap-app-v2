"use client";

import pluralize from "pluralize";
import React, { type FC } from "react";
import { ATTENTION_META } from "@/components/Inbox/attentionMeta";
import { AiScore, DueChip, KindTag, StatusBadge } from "@/components/Inbox/InboxBadges";
import { describeFollowUp } from "@/components/Inbox/stageAge";
import type { InboxItem } from "@/components/Inbox/types";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

/** Prints a stored calendar day in UTC — see utilities/calendarDay. */
const formatCalendarDay = (iso: string): string => formatDate(iso, "UTC");

/** Days in stage from which the clock turns red. */
const CRITICAL_DAYS = 90;

/** Stages that are red regardless of age: the deadline itself has passed. */
const RED_STAGES = new Set<string>(["past_due"]);

/**
 * One sentence on where the item stands: the stage and how long it has been
 * there, then the next chase. Reads as prose, not as a row of chips, because a
 * reader scans forty of these and chips of four hues told them nothing the
 * words did not. Red is reserved for a missed date: a past-due milestone, a
 * stage held past the critical threshold, or an overdue follow-up.
 */
const StatusLine: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason) return null;
  const stages = item.pendingGates?.length ? item.pendingGates : [item.attentionReason];
  const meta = ATTENTION_META[item.attentionReason];
  const days = item.stageAgeDays;
  const stageRed =
    stages.some((stage) => RED_STAGES.has(stage)) ||
    (typeof days === "number" && days >= CRITICAL_DAYS);
  const followUp = item.nextFollowUpAt
    ? describeFollowUp(item.nextFollowUpAt, formatCalendarDay)
    : null;
  const openNotes = item.openActionItems ?? 0;

  return (
    <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span
        title={stages.map((stage) => ATTENTION_META[stage].description).join(" ")}
        className={cn(
          "font-medium",
          stageRed ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200"
        )}
      >
        {stages.map((stage) => ATTENTION_META[stage].label).join(" and ")}
        {typeof days === "number" && (
          <span title={meta.clockDescription} className="font-normal tabular-nums">
            {" "}
            {days} {pluralize("day", days)}
          </span>
        )}
      </span>
      {followUp && (
        <>
          <span aria-hidden="true">·</span>
          <span
            title={`Next follow-up ${followUp.label}`}
            className={cn(followUp.overdue && "font-medium text-red-600 dark:text-red-400")}
          >
            {followUp.overdue ? "follow-up overdue" : `follow-up ${followUp.shortLabel}`}
          </span>
        </>
      )}
      {!followUp && openNotes === 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span>no follow-up yet</span>
        </>
      )}
      {openNotes > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span title="Follow-up notes logged by admins that are not marked done">
            {openNotes} open {pluralize("note", openNotes)}
          </span>
        </>
      )}
    </span>
  );
};

/**
 * Who and where: the project for a milestone, the applicant for an
 * application, then the program when it varies across the visible rows.
 */
function provenance(item: InboxItem, hideSubtitle: boolean): string | null {
  const primary = item.kind === "milestone" ? item.project : item.who;
  const secondary = !hideSubtitle ? item.subtitle : undefined;
  const parts = [primary, secondary].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

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
 * An admin row is the title with its provenance under it, then one sentence
 * of status. No glyphs, no chips, no score: the kind is implied by the title
 * and the group, the stage is said in words, and colour appears only where a
 * date was missed. Rows are separated by hairlines rather than drawn as
 * cards. Purely presentational — selection state and handling are driven by
 * props.
 */
const InboxListItemComponent: FC<InboxListItemProps> = ({
  item,
  selected,
  onSelect,
  hideKind = false,
  hideSubtitle = false,
}) => {
  const isAdminRow = Boolean(item.attentionReason);
  const where = provenance(item, hideSubtitle);

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(item.id)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group block h-auto w-full min-w-0 justify-start whitespace-normal rounded-none px-4 py-3 text-left focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
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

      <span
        className={cn(
          "line-clamp-2 block text-sm font-semibold leading-snug",
          selected ? "text-gray-950 dark:text-white" : "text-gray-900 dark:text-gray-100"
        )}
      >
        {item.title}
      </span>

      {where && (
        <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
          {where}
        </span>
      )}

      {isAdminRow ? (
        <StatusLine item={item} />
      ) : (
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <DueChip item={item} />
          <ApplicationDates item={item} />
          <AiScore score={item.aiScore} className="ml-auto" />
        </span>
      )}
    </Button>
  );
};

export const InboxListItem = React.memo(InboxListItemComponent);
InboxListItem.displayName = "InboxListItem";
