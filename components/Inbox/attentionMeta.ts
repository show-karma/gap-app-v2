import type {
  ApplicationAttentionReason,
  InboxAttentionReason,
  InboxQueueFilter,
  MilestoneAttentionReason,
} from "@/types/funding-platform";

/**
 * Presentation metadata for the admin queue, across both item kinds.
 * Module-level so the tables are built once, not per render.
 *
 * Tones are Tailwind theme classes only — no hardcoded hex — so the badges
 * follow the tenant theme and both light and dark modes.
 */

export interface AttentionMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
  /**
   * Suffix after the days-in-stage count, e.g. "153 days overdue". Each stage
   * measures a different clock, so the wording names what the number counts.
   */
  ageSuffix: string;
}

const RED = {
  badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  dotClass: "bg-red-500",
};
const BRAND = {
  badgeClass: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  dotClass: "bg-primary-500",
};
const AMBER = {
  badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  dotClass: "bg-amber-500",
};
const PURPLE = {
  badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  dotClass: "bg-purple-500",
};
const INDIGO = {
  badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  dotClass: "bg-indigo-500",
};
const SLATE = {
  badgeClass: "bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-200",
  dotClass: "bg-slate-500",
};

export const ATTENTION_META: Record<InboxAttentionReason, AttentionMeta> = {
  past_due: { label: "Past due", ageSuffix: "overdue", ...RED },
  awaiting_review: { label: "Awaiting review", ageSuffix: "waiting", ...BRAND },
  awaiting_invoice: { label: "Awaiting invoice", ageSuffix: "waiting", ...AMBER },
  invoice_unpaid: { label: "Invoice unpaid", ageSuffix: "unpaid", ...PURPLE },
  pending_review: { label: "Pending review", ageSuffix: "waiting", ...INDIGO },
  under_review: { label: "Under review", ageSuffix: "in review", ...BRAND },
  revision_requested: { label: "Revision requested", ageSuffix: "with applicant", ...AMBER },
  kyb_pending: { label: "KYB pending", ageSuffix: "since approval", ...SLATE },
  agreement_pending: { label: "Agreement pending", ageSuffix: "since approval", ...SLATE },
};

/** Milestone stage order in the filter — mirrors the milestone lifecycle. */
export const MILESTONE_FILTER_ORDER: MilestoneAttentionReason[] = [
  "past_due",
  "awaiting_review",
  "awaiting_invoice",
  "invoice_unpaid",
];

/** Application stage order in the filter — review stages, then paperwork. */
export const APPLICATION_FILTER_ORDER: ApplicationAttentionReason[] = [
  "pending_review",
  "under_review",
  "revision_requested",
  "kyb_pending",
  "agreement_pending",
];

export const FOLLOW_UP_FILTER: InboxQueueFilter = "followup_due";

export const FOLLOW_UP_FILTER_LABEL = "Follow-up due";

const APPLICATION_REASONS = new Set<string>(APPLICATION_FILTER_ORDER);

export function isApplicationReason(
  reason: InboxAttentionReason | InboxQueueFilter
): reason is ApplicationAttentionReason {
  return APPLICATION_REASONS.has(reason);
}
