import type { ReportType } from "@/types/portfolio-report";

const MONTH_REGEX = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;
const BIWEEKLY_REGEX = /^(19|20)\d{2}-(0[1-9]|1[0-2])-H[12]$/;

/**
 * Accepted by route validation and the public report-by-period endpoint.
 * Anything else should 404 / show "not found".
 */
export const PERIOD_ID_REGEX = /^(19|20)\d{2}-(0[1-9]|1[0-2])(-H[12])?$/;

export function isMonthlyId(value: string): boolean {
  return MONTH_REGEX.test(value);
}

export function isBiweeklyId(value: string): boolean {
  return BIWEEKLY_REGEX.test(value);
}

export function reportTypeOfId(value: string): ReportType | null {
  if (isBiweeklyId(value)) return "portfolio_biweekly";
  if (isMonthlyId(value)) return "portfolio_monthly";
  return null;
}

export function getPreviousMonthId(now: Date = new Date()): string {
  const year =
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getPreviousBiweeklyId(now: Date = new Date()): string {
  const day = now.getDate();
  const year = now.getFullYear();
  const monthIdx = now.getMonth();
  if (day >= 16) {
    return `${year}-${String(monthIdx + 1).padStart(2, "0")}-H1`;
  }
  const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
  const prevYear = monthIdx === 0 ? year - 1 : year;
  return `${prevYear}-${String(prevMonthIdx + 1).padStart(2, "0")}-H2`;
}

export function getPreviousPeriodId(
  reportType: ReportType,
  now: Date = new Date()
): string {
  return reportType === "portfolio_biweekly"
    ? getPreviousBiweeklyId(now)
    : getPreviousMonthId(now);
}

export interface ParsedPeriod {
  reportType: ReportType;
  /** "April 2026" for monthly; "April 2026 — 1st half" for biweekly. */
  label: string;
  /** "Apr 2026" / "Apr 2026 H1" — for compact rows / table cells. */
  shortLabel: string;
  /** "MM/YY" for monthly badges; "MM-H1/YY" for biweekly. */
  badge: string;
}

export function formatPeriod(periodId: string): ParsedPeriod {
  const detectedType = reportTypeOfId(periodId);
  if (!detectedType) {
    return {
      reportType: "portfolio_monthly",
      label: periodId,
      shortLabel: periodId,
      badge: periodId,
    };
  }

  if (detectedType === "portfolio_monthly") {
    const [yearStr, monthStr] = periodId.split("-");
    const date = new Date(Number(yearStr), Number(monthStr) - 1);
    return {
      reportType: "portfolio_monthly",
      label: date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      shortLabel: date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      badge: `${monthStr} / ${yearStr.slice(2)}`,
    };
  }

  const [yearStr, monthStr, halfStr] = periodId.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1);
  const longBase = date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const shortBase = date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  const halfLabel = halfStr === "H1" ? "1st half" : "2nd half";
  return {
    reportType: "portfolio_biweekly",
    label: `${longBase} — ${halfLabel}`,
    shortLabel: `${shortBase} ${halfStr}`,
    badge: `${monthStr}-${halfStr} / ${yearStr.slice(2)}`,
  };
}

/**
 * Order period identifiers chronologically (ascending). Biweekly H2
 * comes after H1 of the same month. Used by the public timeline.
 */
export function comparePeriodIds(a: string, b: string): number {
  const pa = parseSortable(a);
  const pb = parseSortable(b);
  if (pa.year !== pb.year) return pa.year - pb.year;
  if (pa.month !== pb.month) return pa.month - pb.month;
  return pa.half - pb.half;
}

function parseSortable(periodId: string): {
  year: number;
  month: number;
  half: number;
} {
  const parts = periodId.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  // Monthly periods are treated as "after H2" so a monthly and biweekly
  // report for the same month don't tie. Tunable, but comparePeriodIds is
  // only ever called within a single reportType's set in practice.
  let half = 3;
  if (parts[2] === "H1") half = 1;
  else if (parts[2] === "H2") half = 2;
  return { year, month, half };
}
