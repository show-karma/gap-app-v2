import { TOKENS } from "@/config/tokens";
import type {
  ProjectIndicator,
  ProjectIndicatorDatapoint,
  TrackRecordGrant,
  TrackRecordMilestone,
} from "@/services/applicationInsights.service";
import { formatDate as formatAppDate } from "@/utilities/formatDate";
import { formatGrantAmount } from "@/utilities/formatGrantAmount";

const DAY_MS = 86_400_000;
const DELIVERED_STATUSES = new Set(["completed", "verified"]);
const ACTIVITY_WINDOW_DAYS = 90;
const SERIES_MAX_POINTS = 120;

export type MilestoneStateKind = "delivered" | "past_due" | "in_progress" | "upcoming" | "rejected";

export interface MilestoneState {
  kind: MilestoneStateKind;
  /** Delivered: completion date minus due date. Open: due date minus today. */
  dayOffset: number | null;
}

const IN_PROGRESS_WINDOW_DAYS = 45;

function utcDay(value: string | Date): number {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Calendar-day difference, so a delivery at 3pm two days after the due date reads as 2 days. */
function daysBetween(later: string | Date, earlier: string | Date): number {
  return Math.round((utcDay(later) - utcDay(earlier)) / DAY_MS);
}

export function getMilestoneState(milestone: TrackRecordMilestone, now: Date): MilestoneState {
  if (milestone.currentStatus === "rejected") return { kind: "rejected", dayOffset: null };
  const delivered =
    DELIVERED_STATUSES.has(milestone.currentStatus) || Boolean(milestone.completedAt);
  if (delivered) {
    const offset =
      milestone.completedAt && milestone.dueDate
        ? daysBetween(milestone.completedAt, milestone.dueDate)
        : null;
    return { kind: "delivered", dayOffset: offset };
  }
  if (!milestone.dueDate) return { kind: "upcoming", dayOffset: null };
  const daysLeft = daysBetween(milestone.dueDate, now);
  if (daysLeft < 0) return { kind: "past_due", dayOffset: daysLeft };
  return {
    kind: daysLeft <= IN_PROGRESS_WINDOW_DAYS ? "in_progress" : "upcoming",
    dayOffset: daysLeft,
  };
}

export interface FundingByToken {
  token: string;
  approved: number;
  paid: number;
  grantCount: number;
}

export interface TrackRecordSummary {
  milestoneCount: number;
  deliveredCount: number;
  deliveredLateCount: number;
  pastDueCount: number;
  /** Approved and paid amounts grouped by token, largest approved first; never summed across tokens. */
  fundingByToken: FundingByToken[];
  grantsWithoutAmount: string[];
}

export function parseAmount(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function grantLabel(grant: TrackRecordGrant): string {
  return grant.title?.trim() || "Untitled grant";
}

/** Payouts are recorded in USDC when a grant's payout config names no token. */
export function grantToken(grant: TrackRecordGrant): string {
  return grant.tokenSymbol ?? grant.paidTokenSymbol ?? TOKENS.usdc.symbol;
}

function groupFundingByToken(grants: TrackRecordGrant[]): FundingByToken[] {
  const groups = new Map<string, FundingByToken>();
  for (const grant of grants) {
    const approved = parseAmount(grant.totalGrantAmount);
    if (approved === null) continue;
    const token = grantToken(grant);
    const group = groups.get(token) ?? { token, approved: 0, paid: 0, grantCount: 0 };
    group.approved += approved;
    group.paid += parseAmount(grant.paidAmount) ?? 0;
    group.grantCount += 1;
    groups.set(token, group);
  }
  return Array.from(groups.values()).sort((a, b) => b.approved - a.approved);
}

export function summarizeTrackRecord(grants: TrackRecordGrant[], now: Date): TrackRecordSummary {
  const milestones = grants.flatMap((grant) => grant.milestones);
  const states = milestones.map((milestone) => getMilestoneState(milestone, now));
  const delivered = states.filter((state) => state.kind === "delivered");

  return {
    milestoneCount: milestones.length,
    deliveredCount: delivered.length,
    deliveredLateCount: delivered.filter((state) => (state.dayOffset ?? 0) > 0).length,
    pastDueCount: states.filter((state) => state.kind === "past_due").length,
    fundingByToken: groupFundingByToken(grants),
    grantsWithoutAmount: grants
      .filter((grant) => parseAmount(grant.totalGrantAmount) === null)
      .map(grantLabel),
  };
}

/** Days between a milestone's completion and its payment; null when either is missing. */
export function paymentDelayDays(milestone: TrackRecordMilestone): number | null {
  if (!milestone.completedAt || !milestone.paidAt) return null;
  return daysBetween(milestone.paidAt, milestone.completedAt);
}

/** Approved minus the milestone allocations, when the grant splits only part of its amount. */
export function unallocatedAmount(grant: TrackRecordGrant): number | null {
  const approved = parseAmount(grant.totalGrantAmount);
  const allocations = grant.milestones
    .map((milestone) => parseAmount(milestone.allocatedAmount))
    .filter((value): value is number => value !== null);
  if (approved === null || allocations.length === 0) return null;
  const remainder = approved - allocations.reduce((sum, value) => sum + value, 0);
  return remainder > 0 ? remainder : null;
}

interface DatapointBreakdown {
  commitmentType?: string;
  slaStatement?: string;
  direction?: string;
}

function parseBreakdown(datapoint: ProjectIndicatorDatapoint | undefined): DatapointBreakdown {
  if (!datapoint?.breakdown) return {};
  try {
    const parsed: unknown = JSON.parse(datapoint.breakdown);
    return parsed && typeof parsed === "object" ? (parsed as DatapointBreakdown) : {};
  } catch {
    // SUPPRESSED: breakdown is free-form indicator metadata; a malformed value just means no commitment info.
    return {};
  }
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortedDatapoints(indicator: ProjectIndicator): ProjectIndicatorDatapoint[] {
  return [...indicator.datapoints]
    .filter((datapoint) => toNumber(datapoint.value) !== null)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface IndicatorSeries {
  id: string;
  name: string;
  unit: string | null;
  latestValue: number;
  latestDate: string;
  firstDate: string;
  points: SeriesPoint[];
}

export interface Commitment extends IndicatorSeries {
  statement: string | null;
  operator: string | null;
  target: number | null;
  met: boolean | null;
}

function compare(value: number, operator: string, target: number): boolean | null {
  switch (operator) {
    case "<=":
      return value <= target;
    case "<":
      return value < target;
    case ">=":
      return value >= target;
    case ">":
      return value > target;
    case "=":
    case "==":
      return value === target;
    default:
      return null;
  }
}

function toSeries(indicator: ProjectIndicator, now: Date): IndicatorSeries | null {
  const points = sortedDatapoints(indicator);
  const latest = points.at(-1);
  if (!latest) return null;
  const windowStart = new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * DAY_MS).toISOString();
  const recent = points.filter((point) => point.startDate >= windowStart);
  const window = (recent.length >= 2 ? recent : points).slice(-SERIES_MAX_POINTS);
  return {
    id: indicator.id,
    name: indicator.name,
    unit: indicator.unitOfMeasure ?? null,
    latestValue: toNumber(latest.value) ?? 0,
    latestDate: latest.startDate,
    firstDate: window[0]?.startDate ?? latest.startDate,
    points: window.map((point) => ({ date: point.startDate, value: toNumber(point.value) ?? 0 })),
  };
}

export function isCommitmentIndicator(indicator: ProjectIndicator): boolean {
  const latest = sortedDatapoints(indicator).at(-1);
  return Boolean(parseBreakdown(latest).commitmentType);
}

export function buildCommitments(indicators: ProjectIndicator[], now: Date): Commitment[] {
  return indicators.filter(isCommitmentIndicator).flatMap((indicator) => {
    const series = toSeries(indicator, now);
    if (!series) return [];
    const latest = sortedDatapoints(indicator).at(-1);
    const breakdown = parseBreakdown(latest);
    const target = toNumber(latest?.thresholdValue);
    const operator = latest?.thresholdOp ?? null;
    return [
      {
        ...series,
        name: indicator.description?.split(" — ")[0]?.trim() || indicator.name,
        statement: breakdown.slaStatement ?? null,
        operator,
        target,
        met: target !== null && operator ? compare(series.latestValue, operator, target) : null,
      },
    ];
  });
}

export function buildActivity(indicators: ProjectIndicator[], now: Date): IndicatorSeries[] {
  return indicators
    .filter((indicator) => !isCommitmentIndicator(indicator))
    .map((indicator) => toSeries(indicator, now))
    .filter((series): series is IndicatorSeries => series !== null)
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

export interface SimFundingView {
  fundsUpTo: number | null;
}

/** The dollar amount at which a Sim's marginal-value curve reaches zero (or its last point). */
export function simFundsUpTo(
  mvf: { dollars: number; marginalValueMilli: number }[]
): number | null {
  if (!mvf.length) return null;
  const sorted = [...mvf].sort((a, b) => a.dollars - b.dollars);
  const saturation = sorted.find((point) => point.marginalValueMilli <= 0);
  return (saturation ?? sorted[sorted.length - 1]).dollars;
}

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Plain metric values (indicator readings, counts); token amounts go through formatTokenAmount. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatTokenAmount(value: number, token: string | null = null): string {
  return formatGrantAmount(`${value}${token ? ` ${token}` : ""}`) ?? (token ? `0 ${token}` : "0");
}

export function formatDate(value: string, withYear = true): string {
  return formatAppDate(value, "UTC", withYear ? "MMM D, YYYY" : "MMM D");
}
