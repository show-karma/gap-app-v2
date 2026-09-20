import type { MilestoneAttentionReason, MilestoneQueueFilter } from "@/types/funding-platform";

/**
 * Presentation metadata for the admin milestone queue. Module-level so the
 * tables are built once, not per render.
 *
 * Tones are Tailwind theme classes only — no hardcoded hex — so the badges
 * follow the tenant theme and both light and dark modes.
 */

export interface AttentionMeta {
  label: string;
  /** Short form for a dense list row. */
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
}

export const ATTENTION_META: Record<MilestoneAttentionReason, AttentionMeta> = {
  past_due: {
    label: "Past due",
    shortLabel: "Past due",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    dotClass: "bg-red-500",
  },
  awaiting_review: {
    label: "Awaiting review",
    shortLabel: "Review",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    dotClass: "bg-teal-500",
  },
  awaiting_invoice: {
    label: "Awaiting invoice",
    shortLabel: "No invoice",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  invoice_unpaid: {
    label: "Invoice unpaid",
    shortLabel: "Unpaid",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    dotClass: "bg-purple-500",
  },
};

/** Chip order in the filter bar — mirrors the milestone lifecycle. */
export const ATTENTION_FILTER_ORDER: MilestoneAttentionReason[] = [
  "past_due",
  "awaiting_review",
  "awaiting_invoice",
  "invoice_unpaid",
];

/**
 * Label shown on the stage-age chip for each reason. The number means something
 * different per stage, so the wording has to change with it — "31d overdue" and
 * "31d awaiting payment" are not interchangeable.
 */
export const STAGE_AGE_LABEL: Record<MilestoneAttentionReason, string> = {
  past_due: "overdue",
  awaiting_review: "awaiting review",
  awaiting_invoice: "awaiting invoice",
  invoice_unpaid: "awaiting payment",
};

export const FOLLOW_UP_FILTER: MilestoneQueueFilter = "followup_due";

export const FOLLOW_UP_FILTER_LABEL = "Follow-up due";

/** Human-readable label for any queue filter value. */
export function getFilterLabel(filter: MilestoneQueueFilter): string {
  if (filter === "followup_due") return FOLLOW_UP_FILTER_LABEL;
  return ATTENTION_META[filter].label;
}

/** Narrows a queue filter to an attention reason, excluding the pseudo-filter. */
export function isAttentionReason(
  filter: MilestoneQueueFilter
): filter is MilestoneAttentionReason {
  return filter !== FOLLOW_UP_FILTER;
}
