/**
 * Calendar-day arithmetic for dates the user picked on a calendar.
 *
 * Follow-up dates are not instants — they are a day an admin chose in a
 * `<input type="date">`, stored as UTC midnight so the date portion round-trips
 * unchanged. They must therefore be COMPARED against the viewer's own calendar
 * day, not against UTC.
 *
 * Deriving "today" from `new Date().toISOString()` reads the UTC day, which is
 * already tomorrow for anyone west of UTC late in the day: at 21:09 PDT on
 * Sep 21 it yields "2026-09-22", so a follow-up due that very day rendered as
 * "Follow-up overdue … (yesterday)". Every admin west of UTC saw false overdue
 * flags for the last hours of every day. These helpers read the LOCAL day.
 */

const MS_PER_DAY = 86_400_000;

/** Today as `YYYY-MM-DD` in the viewer's own timezone. */
export function todayCalendarDay(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The `YYYY-MM-DD` portion of a stored date, or null when absent/malformed. */
function calendarDayOf(value: string | null | undefined): string | null {
  const day = value?.slice(0, 10);
  return day && !Number.isNaN(Date.parse(day)) ? day : null;
}

/** Whole days from today to `value`: negative in the past, 0 today. */
function daysFromToday(value: string): number | null {
  const day = calendarDayOf(value);
  // Both sides parse as UTC midnight, so the difference is exact whole days.
  return day === null
    ? null
    : Math.round((Date.parse(day) - Date.parse(todayCalendarDay())) / MS_PER_DAY);
}

/**
 * True when a calendar day falls strictly before today. A date landing ON
 * today is due, never overdue.
 */
export function isBeforeToday(value: string | null | undefined): boolean {
  if (!value) return false;
  const delta = daysFromToday(value);
  return delta !== null && delta < 0;
}

/** "today", "tomorrow", "yesterday", "in 3 days" or "2 days ago". */
export function describeRelativeDay(value: string): string {
  const delta = daysFromToday(value);
  if (delta === null) return "";
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  if (delta === -1) return "yesterday";
  return delta > 0 ? `in ${delta} days` : `${-delta} days ago`;
}
