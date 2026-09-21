"use client";

import {
  BanknotesIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowUpIcon,
  FireIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import React, { type FC } from "react";
import { InboxStatPill } from "@/components/Inbox/InboxStatPill";
import type { InboxStats } from "@/components/Inbox/types";
import type { MilestoneAttentionReason, MilestoneQueueFilter } from "@/types/funding-platform";

interface InboxHeaderProps {
  /** Admin queue: the active stage filter, mirrored on the pills. */
  attentionFilter?: MilestoneQueueFilter | null;
  /** Admin queue: clicking a pill toggles its stage filter. */
  onAttentionChange?: (value: MilestoneQueueFilter | null) => void;
  stats: InboxStats;
  /**
   * Community admins get the milestone-queue counters in place of the generic
   * bucket counters — "3 unpaid invoices" is actionable in a way that
   * "12 in progress" is not.
   */
  isCommunityAdmin?: boolean;
}

const InboxHeaderComponent: FC<InboxHeaderProps> = ({
  stats,
  isCommunityAdmin = false,
  attentionFilter = null,
  onAttentionChange,
}) => {
  const pill = (reason: MilestoneAttentionReason) =>
    onAttentionChange
      ? {
          active: attentionFilter === reason,
          onClick: () => onAttentionChange(attentionFilter === reason ? null : reason),
        }
      : {};
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300">
          <InboxIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">
            Action Items
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {isCommunityAdmin
              ? "Everything in this community that needs attention"
              : "Everything assigned to you"}
          </p>
        </div>
      </div>

      {isCommunityAdmin ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InboxStatPill
            icon={FireIcon}
            value={stats.pastDue ?? 0}
            label="Past due"
            tone="red"
            {...pill("past_due")}
          />
          <InboxStatPill
            icon={BoltIcon}
            value={stats.awaitingReview ?? 0}
            label="Awaiting review"
            tone="brand"
            {...pill("awaiting_review")}
          />
          <InboxStatPill
            icon={DocumentArrowUpIcon}
            value={stats.awaitingInvoice ?? 0}
            label="Awaiting invoice"
            tone="amber"
            {...pill("awaiting_invoice")}
          />
          <InboxStatPill
            icon={BanknotesIcon}
            value={stats.invoiceUnpaid ?? 0}
            label="Invoice unpaid"
            tone="green"
            {...pill("invoice_unpaid")}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InboxStatPill icon={BoltIcon} value={stats.action} label="Waiting on you" tone="brand" />
          <InboxStatPill icon={FireIcon} value={stats.overdue} label="Overdue" tone="red" />
          <InboxStatPill icon={ClockIcon} value={stats.waiting} label="In progress" tone="amber" />
          <InboxStatPill icon={CheckCircleIcon} value={stats.done} label="Cleared" tone="green" />
        </div>
      )}
    </div>
  );
};

export const InboxHeader = React.memo(InboxHeaderComponent);
InboxHeader.displayName = "InboxHeader";
