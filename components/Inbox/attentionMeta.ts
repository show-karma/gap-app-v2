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
  /** Hover text: what the stage means. */
  description: string;
  /** Hover text for the clock: the event the days are counted from. */
  clockDescription: string;
}

const GRAY = {
  badgeClass: "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-200",
  dotClass: "bg-gray-400",
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
const ROSE = {
  badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  dotClass: "bg-rose-500",
};
const SKY = {
  badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  dotClass: "bg-sky-500",
};

export const ATTENTION_META: Record<InboxAttentionReason, AttentionMeta> = {
  past_due: {
    label: "Milestone overdue",
    ageSuffix: "late",
    description: "The milestone's due date has passed and it has not been delivered",
    clockDescription: "Days since the milestone's due date",
    ...GRAY,
  },
  awaiting_review: {
    label: "Milestone awaiting review",
    ageSuffix: "in review",
    description: "The grantee marked the milestone complete; a reviewer has not verified it yet",
    clockDescription: "Days since the grantee marked it complete",
    ...BRAND,
  },
  awaiting_invoice: {
    label: "Awaiting invoice",
    ageSuffix: "waiting",
    description: "The milestone is verified and the program requires an invoice, but none was sent",
    clockDescription: "Days since the milestone was verified",
    ...AMBER,
  },
  invoice_unpaid: {
    label: "Pending payment",
    ageSuffix: "unpaid",
    description: "An invoice was received for this milestone but payment has not been recorded",
    clockDescription: "Days since the invoice was received",
    ...PURPLE,
  },
  pending_review: {
    label: "Pending review",
    ageSuffix: "waiting",
    description: "The application was submitted and no reviewer has opened it yet",
    clockDescription: "Days since the application was submitted",
    ...INDIGO,
  },
  under_review: {
    label: "Under review",
    ageSuffix: "in review",
    description: "A reviewer has the application open; a decision is outstanding",
    clockDescription: "Days since the review started",
    ...BRAND,
  },
  revision_requested: {
    label: "Revision requested",
    ageSuffix: "with applicant",
    description: "The application was sent back to the applicant for changes",
    clockDescription: "Days since the revision was requested",
    ...AMBER,
  },
  kyb_pending: {
    label: "KYB pending",
    ageSuffix: "since approval",
    description: "The application is approved but the KYB verification has not been passed",
    clockDescription: "Days since the application was approved",
    ...ROSE,
  },
  agreement_pending: {
    label: "Agreement pending",
    ageSuffix: "since approval",
    description: "The application is approved but the grant agreement is not signed",
    clockDescription: "Days since the application was approved",
    ...SKY,
  },
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

export const FOLLOW_UP_FILTER_LABEL = "Scheduled check-in";

const APPLICATION_REASONS = new Set<string>(APPLICATION_FILTER_ORDER);

export function isApplicationReason(
  reason: InboxAttentionReason | InboxQueueFilter
): reason is ApplicationAttentionReason {
  return APPLICATION_REASONS.has(reason);
}
