/**
 * Helpers for displaying portfolio-report run dates + computing client-side
 * recurrence previews.
 */
import type { ReportSchedule, ScheduleIntervalUnit } from "@/types/portfolio-report";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

// ── Schedule-label rendering ──────────────────────────────────────

/**
 * Plain-language echo of a recurrence rule, e.g.:
 *   - "Every day, starting Apr 1, 2026 — runs forever"
 *   - "Every 10 days, starting Mon May 18, 2026 — runs forever"
 *   - "Every 2 weeks, starting Mon May 18, 2026 — until Dec 31, 2026"
 *   - "Every month, starting Apr 15, 2026 — runs forever"
 *   - "Every 3 months (quarterly), starting Apr 1, 2026 — runs forever"
 *
 * Used in the form's accent-banner echo, the configs list table, and the
 * preset-detection logic (when a free-form schedule happens to match a
 * preset, we surface the preset name instead).
 */
export function formatScheduleLabel(schedule: ReportSchedule): string {
  const everyClause = renderEveryClause(schedule);
  const startClause = `starting ${formatLongRunDate(schedule.startDate)}`;
  const endsClause =
    schedule.ends.kind === "never"
      ? "runs forever"
      : `until ${formatLongRunDate(schedule.ends.date)}`;
  return `${everyClause}, ${startClause} — ${endsClause}`;
}

function renderEveryClause(schedule: ReportSchedule): string {
  const { intervalUnit, intervalCount } = schedule;
  if (intervalCount === 1) {
    if (intervalUnit === "days") return "Every day";
    if (intervalUnit === "weeks") return "Every week";
    return "Every month";
  }
  if (intervalUnit === "weeks" && intervalCount === 2) return "Every 2 weeks (bi-weekly)";
  if (intervalUnit === "months" && intervalCount === 3)
    return "Every 3 months (quarterly)";
  return `Every ${intervalCount} ${intervalUnit}`;
}

function formatLongRunDate(iso: string): string {
  if (!isRunDate(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Presets ────────────────────────────────────────────────────────

export type SchedulePresetKey =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "custom";

interface PresetSpec {
  key: SchedulePresetKey;
  label: string;
  intervalUnit?: ScheduleIntervalUnit;
  intervalCount?: number;
}

/**
 * Stable list used by the preset chip row. `custom` is the escape hatch —
 * it has no fixed `(intervalUnit, intervalCount)`; it's whatever the admin
 * has in the form right now.
 */
export const SCHEDULE_PRESETS: readonly PresetSpec[] = [
  { key: "daily", label: "Daily", intervalUnit: "days", intervalCount: 1 },
  { key: "weekly", label: "Weekly", intervalUnit: "weeks", intervalCount: 1 },
  { key: "biweekly", label: "Bi-weekly", intervalUnit: "weeks", intervalCount: 2 },
  { key: "monthly", label: "Monthly", intervalUnit: "months", intervalCount: 1 },
  { key: "quarterly", label: "Quarterly", intervalUnit: "months", intervalCount: 3 },
  { key: "custom", label: "Custom" },
];

/**
 * Reverse-detect which preset a `Schedule` matches (or `custom` if it
 * doesn't match any). Used to auto-highlight the right preset chip when
 * editing an existing config.
 */
export function detectPreset(schedule: ReportSchedule): SchedulePresetKey {
  for (const p of SCHEDULE_PRESETS) {
    if (
      p.intervalUnit !== undefined &&
      p.intervalCount !== undefined &&
      p.intervalUnit === schedule.intervalUnit &&
      p.intervalCount === schedule.intervalCount
    ) {
      return p.key;
    }
  }
  return "custom";
}

/**
 * Build a default Schedule for a given preset, using `today` as the start
 * date. The admin is free to change startDate/ends afterwards.
 */
export function defaultScheduleForPreset(
  preset: SchedulePresetKey,
  today: Date = new Date()
): ReportSchedule {
  const startDate = toIsoDate(today);
  const spec = SCHEDULE_PRESETS.find((p) => p.key === preset);
  if (!spec || preset === "custom" || !spec.intervalUnit || !spec.intervalCount) {
    return {
      intervalUnit: "days",
      intervalCount: 1,
      startDate,
      ends: { kind: "never" },
    };
  }
  return {
    intervalUnit: spec.intervalUnit,
    intervalCount: spec.intervalCount,
    startDate,
    ends: { kind: "never" },
  };
}

// ── Next-runs preview (client-side) ────────────────────────────────

/**
 * Compute up to `count` upcoming fire dates, given an `anchor` (defaults to
 * today). Mirrors the server-side `computeNextRuns` in gap-indexer/scheduling
 * so the FE preview matches what the cron will actually do.
 */
export function computeNextRuns(
  schedule: ReportSchedule,
  count: number,
  anchor: Date = new Date()
): Date[] {
  if (count <= 0) return [];
  const startUtc = parseIsoToUtc(schedule.startDate);
  if (!startUtc) return [];

  const anchorUtc = toUtcDay(anchor);
  const endUtc =
    schedule.ends.kind === "on_date" ? parseIsoToUtc(schedule.ends.date) : null;

  const out: Date[] = [];
  let cursor = startUtc;
  let safety = 4000;

  while (out.length < count && safety-- > 0) {
    if (cursor.getTime() >= anchorUtc.getTime()) {
      if (endUtc && cursor.getTime() > endUtc.getTime()) break;
      out.push(new Date(cursor));
    }
    cursor = advance(cursor, schedule);
  }
  return out;
}

function advance(cursor: Date, schedule: ReportSchedule): Date {
  if (schedule.intervalUnit === "days") {
    return addUtcDays(cursor, schedule.intervalCount);
  }
  if (schedule.intervalUnit === "weeks") {
    return addUtcDays(cursor, schedule.intervalCount * 7);
  }
  return addUtcMonths(cursor, schedule.intervalCount);
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(d: Date, months: number): Date {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + months;
  const day = d.getUTCDate();
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  return new Date(Date.UTC(targetYear, targetMonth, safeDay));
}

function toUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function parseIsoToUtc(iso: string): Date | null {
  if (!RUN_DATE_REGEX.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Avoid unused-var warning where MS_PER_DAY is shadowed; keep export
// for potential future reuse + harmless compile-time presence.
export const _MS_PER_DAY = MS_PER_DAY;
