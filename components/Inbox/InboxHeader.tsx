"use client";

import {
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import React, { type FC } from "react";
import { InboxStatPill } from "@/components/Inbox/InboxStatPill";
import type { InboxStats } from "@/components/Inbox/types";
import { cn } from "@/utilities/tailwind";

interface InboxHeaderProps {
  stats: InboxStats;
  /**
   * Community admins get the stage chips below the header instead of these
   * pills. The two used to render side by side over the same four filters —
   * same keys, same handler, same counts — so clicking either lit up both.
   * The chips win: they also carry "All" and "Follow-up due", and they read
   * as controls rather than as statistics that happen to be clickable.
   */
  isCommunityAdmin?: boolean;
  showQueueSummary?: boolean;
}

interface SummaryPart {
  key: string;
  count: number;
  /** Fully formed, already pluralized — e.g. "4 follow-ups due". */
  label: string;
  /** Only the part that means "someone is late" earns colour. */
  urgent?: boolean;
}

/**
 * The admin header's one-line summary.
 *
 * This replaces a 4-tile stat grid that cost ~110px and repeated numbers the
 * filter chips already carry. A segment with a count of zero is dropped
 * entirely rather than rendering "0 past due" — an empty category is not news.
 */
function buildSummary(stats: InboxStats): SummaryPart[] {
  const pastDue = stats.pastDue ?? 0;
  const invoiceUnpaid = stats.invoiceUnpaid ?? 0;
  const followUpDue = stats.followUpDue ?? 0;

  const parts: SummaryPart[] = [
    { key: "pastDue", count: pastDue, label: "past due", urgent: true },
    { key: "invoiceUnpaid", count: invoiceUnpaid, label: "awaiting payment" },
    {
      key: "followUpDue",
      count: followUpDue,
      label: `${pluralize("follow-up", followUpDue)} due`,
    },
  ];
  return parts.filter((part) => part.count > 0);
}

const AdminSummary: FC<{ stats: InboxStats }> = ({ stats }) => {
  const parts = buildSummary(stats);
  if (parts.length === 0) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
      {parts.map((part, index) => (
        <React.Fragment key={part.key}>
          {index > 0 && (
            <span className="text-gray-300 dark:text-zinc-600" aria-hidden="true">
              ·
            </span>
          )}
          <span
            className={cn(
              part.urgent
                ? "font-semibold text-red-600 dark:text-red-400"
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            <span className="tabular-nums">{part.count}</span> {part.label}
          </span>
        </React.Fragment>
      ))}
    </p>
  );
};

const InboxHeaderComponent: FC<InboxHeaderProps> = ({
  stats,
  isCommunityAdmin = false,
  showQueueSummary = true,
}) => {
  // The admin queue is a working surface, not a landing page: the title drops
  // to breadcrumb scale and the summary moves inline, which is ~230px of
  // vertical space handed back to the queue itself.
  if (isCommunityAdmin) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-base font-semibold leading-tight text-gray-900 dark:text-white">
          Action Items
        </h1>
        {showQueueSummary && (
          <>
            <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
              {stats.milestones + stats.applications}
            </span>
            <AdminSummary stats={stats} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
          <InboxIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">
            Action Items
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Everything assigned to you
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <InboxStatPill icon={BoltIcon} value={stats.action} label="Waiting on you" tone="brand" />
        <InboxStatPill icon={FireIcon} value={stats.overdue} label="Overdue" tone="red" />
        <InboxStatPill icon={ClockIcon} value={stats.waiting} label="In progress" tone="amber" />
        <InboxStatPill icon={CheckCircleIcon} value={stats.done} label="Cleared" tone="green" />
      </div>
    </div>
  );
};

export const InboxHeader = React.memo(InboxHeaderComponent);
InboxHeader.displayName = "InboxHeader";
