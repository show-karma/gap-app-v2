"use client";

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

/**
 * Who the row is about. The project is what the admin recognises, so it leads
 * for a milestone; an application has no project yet, so its own name leads.
 */
function headline(item: InboxItem): { primary: string; secondary: string | null } {
  if (item.kind === "milestone" && item.project) {
    return { primary: item.project, secondary: item.title };
  }
  return { primary: item.title, secondary: item.who ?? null };
}

/** "Filecoin ProPGF Batch 2" → "Batch 2"; anything else stays as it is. */
function shortProgram(name: string | undefined): string | null {
  if (!name) return null;
  const match = name.match(/batch\s*\d+/i);
  return match ? match[0] : name;
}

/**
 * How long the item has sat in its stage, in the grantee's words rather than a
 * stage badge: "143d late", "22d in review". Quiet grey, because the grantee
 * being late is the queue's normal state and red would stop meaning anything.
 */
const Clock: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason || typeof item.stageAgeDays !== "number") return null;
  const meta = ATTENTION_META[item.attentionReason];
  return (
    <span
      title={meta.clockDescription}
      className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400"
    >
      {item.stageAgeDays}d {meta.ageSuffix}
    </span>
  );
};

/**
 * The stage, as a dot and a word, then the next chase. Red is reserved for an
 * overdue follow-up: the one date on the row that is the admin's own.
 */
const StatusLine: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason) return null;
  const stages = item.pendingGates?.length ? item.pendingGates : [item.attentionReason];
  const followUp = item.nextFollowUpAt
    ? describeFollowUp(item.nextFollowUpAt, formatCalendarDay)
    : null;

  return (
    <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-1.5 w-1.5 self-center rounded-full",
          ATTENTION_META[item.attentionReason].dotClass
        )}
      />
      <span
        title={stages.map((stage) => ATTENTION_META[stage].description).join(" ")}
        className="text-gray-700 dark:text-gray-200"
      >
        {stages.map((stage) => ATTENTION_META[stage].label).join(" and ")}
      </span>
      <span aria-hidden="true">·</span>
      {followUp ? (
        <span
          title={`Next follow-up ${followUp.label}`}
          className={cn(followUp.overdue && "font-medium text-red-600 dark:text-red-400")}
        >
          {followUp.overdue ? "follow-up overdue" : `follow up ${followUp.shortLabel}`}
        </span>
      ) : (
        <span>no follow-up yet</span>
      )}
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
 * An admin row reads like a contact card: who (project or applicant) in bold,
 * what underneath, the clock and the program on the right, and one line of
 * status. No chips, no counts, no score. Rows are separated by hairlines
 * rather than drawn as cards. Purely presentational — selection state and
 * handling are driven by props.
 */
const InboxListItemComponent: FC<InboxListItemProps> = ({
  item,
  selected,
  onSelect,
  hideKind = false,
  hideSubtitle = false,
}) => {
  const isAdminRow = Boolean(item.attentionReason);
  const { primary, secondary } = headline(item);
  const program = hideSubtitle ? null : shortProgram(item.subtitle);

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

      <span className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "line-clamp-1 block text-sm font-semibold leading-snug",
              selected ? "text-gray-950 dark:text-white" : "text-gray-900 dark:text-gray-100"
            )}
          >
            {primary}
          </span>
          {secondary && (
            <span className="mt-0.5 block truncate text-sm text-gray-600 dark:text-gray-300">
              {secondary}
            </span>
          )}
        </span>
        {isAdminRow && (
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            <Clock item={item} />
            {program && <span className="text-xs text-gray-400 dark:text-zinc-500">{program}</span>}
          </span>
        )}
      </span>

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
