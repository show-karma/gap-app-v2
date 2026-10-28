"use client";

import React, { type FC } from "react";
import { ATTENTION_META } from "@/components/Inbox/attentionMeta";
import { Button } from "@/components/ui/button";
import type {
  InboxKindFilter,
  InboxQueueFilter,
  IReviewerInboxStats,
} from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface InboxViewTabsProps {
  stats: IReviewerInboxStats;
  /** `null` = the whole queue. */
  value: InboxQueueFilter | null;
  onChange: (value: InboxQueueFilter | null) => void;
  /** The stream the queue is narrowed to; `null` offers both streams' views. */
  kind?: InboxKindFilter | null;
}

interface View {
  key: InboxQueueFilter | null;
  label: string;
  count: number;
}

/**
 * The views an admin works from, as tabs. A tab is the one control a visitor
 * never has to learn: it names a place, it is either current or not, and the
 * row of them is the table of contents for the queue. Counts come from the
 * full feed so they hold steady while a view is open; a view with nothing in
 * it is not offered. "All" leads because it is where the queue opens. The
 * breakdown follows the Type filter: milestone stages for milestones, the
 * post-approval gates for applications, both when the queue is not narrowed.
 */
const InboxViewTabsComponent: FC<InboxViewTabsProps> = ({
  stats,
  value,
  onChange,
  kind = null,
}) => {
  const all =
    kind === "milestone"
      ? stats.milestones
      : kind === "application"
        ? stats.applications
        : stats.applications + stats.milestones;
  const milestoneViews: View[] = [
    { key: "past_due", label: ATTENTION_META.past_due.label, count: stats.pastDue ?? 0 },
    {
      key: "invoice_unpaid",
      label: ATTENTION_META.invoice_unpaid.label,
      count: stats.invoiceUnpaid ?? 0,
    },
    {
      key: "awaiting_invoice",
      label: ATTENTION_META.awaiting_invoice.label,
      count: stats.awaitingInvoice ?? 0,
    },
  ];
  const applicationViews: View[] = [
    { key: "kyb_pending", label: ATTENTION_META.kyb_pending.label, count: stats.kybPending ?? 0 },
    {
      key: "agreement_pending",
      label: ATTENTION_META.agreement_pending.label,
      count: stats.agreementPending ?? 0,
    },
  ];
  const candidates: View[] = [
    { key: null, label: "All", count: all },
    { key: "followup_due", label: "Follow-ups due", count: stats.followUpDue ?? 0 },
    ...(kind !== "application" ? milestoneViews : []),
    ...(kind !== "milestone" ? applicationViews : []),
  ];
  const views = candidates.filter((view) => view.count > 0);
  if (views.length <= 1) return null;

  const selected = views.find((view) => view.key === value) ?? views[0];

  return (
    <div
      role="tablist"
      aria-label="Queue views"
      className="flex min-w-0 items-stretch gap-1 overflow-x-auto [scrollbar-width:thin]"
    >
      {views.map((view) => {
        const current = view === selected;
        return (
          <Button
            key={view.key ?? "all"}
            type="button"
            role="tab"
            variant="ghost"
            aria-selected={current}
            onClick={() => onChange(view.key)}
            className={cn(
              "h-auto shrink-0 gap-1.5 whitespace-nowrap rounded-none border-b-2 px-2 pb-2.5 pt-2 text-sm font-medium hover:bg-transparent",
              current
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            )}
          >
            {view.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                current
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              {view.count}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export const InboxViewTabs = React.memo(InboxViewTabsComponent);
InboxViewTabs.displayName = "InboxViewTabs";
