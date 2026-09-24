import type { InboxItem } from "@/components/Inbox/types";
import { describeRelativeDay, isBeforeToday } from "@/utilities/calendarDay";

/**
 * Time-in-stage and follow-up presentation for the admin queue.
 *
 * The queue used to spend four hues on WHICH stage an item sits in — a fact the
 * reader already knows, because they clicked that stage's chip — while the
 * number that actually decides priority (379 days unpaid) rendered in plain
 * body text. Colour now carries one meaning only: how long this has been stuck.
 * The stage keeps its badge, and nothing else.
 *
 * Tones are Tailwind palette classes so they follow the tenant theme and both
 * colour schemes. Never hardcode a hex here — see the design-system rules in
 * gap-app-v2/CLAUDE.md (DS001/DS002).
 */

/**
 * Upper bound (exclusive) of each heat band, in whole days stuck.
 *
 * Three bands, in the severity colours this feature already speaks: the stage
 * dots in ATTENTION_META and InboxList use amber-500 / red-500, and red-700 is
 * the existing "bad" text tone in ATTENTION_META and InboxBadges. No new hue is
 * introduced for the scale — the numeral beside the bar carries the precision.
 */
const HEAT_BANDS = [
  { under: 30, bar: "bg-amber-500", text: "text-gray-600 dark:text-gray-400" },
  { under: 90, bar: "bg-red-500", text: "text-gray-600 dark:text-gray-400" },
] as const;

/** 90 days and beyond: the only band that also tints the numeral. */
const HEAT_MAX = { bar: "bg-red-700", text: "text-red-700 dark:text-red-400" } as const;

/** Nothing to grade — a reviewer-scoped row carries no stage age. */
const HEAT_NONE = { bar: "bg-gray-200 dark:bg-zinc-700", text: "text-gray-500 dark:text-gray-400" };

export interface StageAgeTone {
  /** Class for the 3px edge bar on the list row. */
  bar: string;
  /** Class for the "379d" numeral. Only the hot bands tint the text. */
  text: string;
}

/**
 * Heat for a number of days spent in the current stage. The bands are wide on
 * purpose: the reader needs "recent / slipping / bad / abandoned", not a
 * gradient they have to decode against a legend.
 */
export function stageAgeTone(days: number | undefined): StageAgeTone {
  if (typeof days !== "number" || Number.isNaN(days)) return HEAT_NONE;
  const band = HEAT_BANDS.find((candidate) => days < candidate.under);
  return band ? { bar: band.bar, text: band.text } : HEAT_MAX;
}

export interface FollowUpDescriptor {
  /** True when a follow-up date is set at all. */
  scheduled: boolean;
  /** True when that date falls before the viewer's own calendar day. */
  overdue: boolean;
  /** "Aug 2, 2026 · 52 days ago", "Sep 30, 2026 · in 7 days", or "No follow-up". */
  label: string;
  /**
   * Relative phrase alone — "52 days ago", "in 7 days", "today".
   *
   * List rows use this. The absolute date is near-identical on every row of a
   * date-ordered queue ("Sep 22, 2026" four times running), so printing it
   * there costs width and repeats itself without separating anything. The full
   * date belongs in the detail pane, where it is stated once.
   */
  shortLabel: string;
  /** Tailwind classes for the slot, keyed off scheduled/overdue. */
  className: string;
}

const FOLLOW_UP_UNSET = "No follow-up";

/**
 * How a row renders its follow-up date.
 *
 * The queue can be ORDERED by this date, so every row has to show it — sorting
 * on a field the reader cannot see produces an order they have no way to check.
 * Rows with no date sort last, and say so rather than rendering blank.
 *
 * A follow-up day is a calendar day stored as UTC midnight, so it is PRINTED in
 * UTC but COMPARED against the viewer's local day. See utilities/calendarDay.
 */
export function describeFollowUp(
  nextFollowUpAt: string | null | undefined,
  formatDay: (iso: string) => string
): FollowUpDescriptor {
  if (!nextFollowUpAt) {
    return {
      scheduled: false,
      overdue: false,
      label: FOLLOW_UP_UNSET,
      shortLabel: FOLLOW_UP_UNSET,
      className: "italic text-gray-500 dark:text-gray-400",
    };
  }

  const overdue = isBeforeToday(nextFollowUpAt);
  const relative = describeRelativeDay(nextFollowUpAt);
  const day = formatDay(nextFollowUpAt);

  return {
    scheduled: true,
    overdue,
    label: relative ? `${day} · ${relative}` : day,
    shortLabel: relative || day,
    // Medium weight, not bold: the days-stuck numeral is the one loud thing on
    // a row. Two competing reds on the same line read as noise, not priority.
    className: overdue
      ? "font-medium text-red-600 dark:text-red-400"
      : "text-gray-500 dark:text-gray-400",
  };
}

/**
 * Splits a follow-up-ordered list at the point where the dates run out.
 *
 * The server already sorts undated items last; without a marker they just
 * appear to sink for no reason, and an item stuck 378 days sitting below one
 * stuck 44 days reads as a bug rather than as "nobody scheduled a chase".
 * Returns the tail as a separate list so the caller can label the boundary.
 */
export function partitionByFollowUp(items: InboxItem[]): {
  scheduled: InboxItem[];
  unscheduled: InboxItem[];
} {
  const scheduled: InboxItem[] = [];
  const unscheduled: InboxItem[] = [];
  for (const item of items) {
    (item.nextFollowUpAt ? scheduled : unscheduled).push(item);
  }
  return { scheduled, unscheduled };
}
