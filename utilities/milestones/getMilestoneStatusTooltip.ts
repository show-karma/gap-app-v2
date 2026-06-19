import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";
import { formatDate } from "@/utilities/formatDate";
import { MILESTONE_STATUS_LABEL } from "@/utilities/milestones/getEffectiveMilestoneStatus";

/**
 * Single source of truth for the milestone-status tooltip copy shown next to
 * lifecycle-status pills (control center + public project details modal).
 *
 * Fallback strings are derived from {@link MILESTONE_STATUS_LABEL} so the
 * tooltip can never drift in capitalization from the badge it annotates
 * (the previous copy-pasted implementations emitted "Past due", contradicting
 * the canonical "Past Due").
 */
export function getMilestoneStatusTooltip(
  effectiveStatus: MilestoneLifecycleStatus,
  statusUpdatedAt: string | null,
  dueDate: string | null
): string {
  const fmtDate = (iso: string) => formatDate(iso, "UTC");
  switch (effectiveStatus) {
    case MilestoneLifecycleStatus.COMPLETED:
      return statusUpdatedAt
        ? `Completed on ${fmtDate(statusUpdatedAt)}`
        : MILESTONE_STATUS_LABEL[MilestoneLifecycleStatus.COMPLETED];
    case MilestoneLifecycleStatus.VERIFIED:
      return statusUpdatedAt
        ? `Verified on ${fmtDate(statusUpdatedAt)}`
        : MILESTONE_STATUS_LABEL[MilestoneLifecycleStatus.VERIFIED];
    case MilestoneLifecycleStatus.PAST_DUE:
      return dueDate
        ? `Due ${fmtDate(dueDate)}`
        : MILESTONE_STATUS_LABEL[MilestoneLifecycleStatus.PAST_DUE];
    case MilestoneLifecycleStatus.PENDING: {
      const parts: string[] = [];
      if (statusUpdatedAt) parts.push(`Created ${fmtDate(statusUpdatedAt)}`);
      if (dueDate) parts.push(`Due ${fmtDate(dueDate)}`);
      return parts.length > 0
        ? parts.join(" · ")
        : MILESTONE_STATUS_LABEL[MilestoneLifecycleStatus.PENDING];
    }
    default:
      return effectiveStatus;
  }
}
