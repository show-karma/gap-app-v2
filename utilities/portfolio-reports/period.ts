/**
 * Helpers for displaying portfolio-report run dates in the UI.
 *
 * `runDate` on a `PortfolioReport` is an ISO `YYYY-MM-DD` string — the date
 * the report was generated. This module gives us a single shared way to
 * render and validate that string.
 */

/** Accepts an ISO date `YYYY-MM-DD` route segment. */
export const RUN_DATE_REGEX = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isRunDate(value: string): boolean {
  return RUN_DATE_REGEX.test(value);
}

export interface FormattedRunDate {
  /** "April 30, 2026" — long, for headers + breadcrumbs. */
  label: string;
  /** "Apr 30, 2026" — for table cells / list rows. */
  shortLabel: string;
  /** "04/30/26" — for compact badges. */
  badge: string;
}

export function formatRunDate(runDate: string): FormattedRunDate {
  if (!isRunDate(runDate)) {
    return { label: runDate, shortLabel: runDate, badge: runDate };
  }
  const [yearStr, monthStr, dayStr] = runDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(year, month - 1, day);
  // Round-trip check: rejects shape-valid but calendar-invalid dates
  // (e.g., 2026-02-31, 2025-02-29). `new Date(2026, 1, 31)` rolls forward
  // to March 3, which would otherwise mislabel the badge silently.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { label: runDate, shortLabel: runDate, badge: runDate };
  }
  return {
    label: date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    shortLabel: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    badge: `${monthStr}/${dayStr}/${yearStr.slice(2)}`,
  };
}

/**
 * Render a config's `dayOfMonth` (1..28) as a human-readable schedule label,
 * e.g. "Day 1 of every month".
 */
export function formatScheduleLabel(dayOfMonth: number): string {
  const ord = ordinalSuffix(dayOfMonth);
  return `${dayOfMonth}${ord} of every month`;
}

function ordinalSuffix(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
