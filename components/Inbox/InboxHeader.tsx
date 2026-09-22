"use client";

import {
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import React, { type FC } from "react";
import { InboxStatPill } from "@/components/Inbox/InboxStatPill";
import type { InboxStats } from "@/components/Inbox/types";

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
}

const InboxHeaderComponent: FC<InboxHeaderProps> = ({ stats, isCommunityAdmin = false }) => (
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
          {isCommunityAdmin
            ? "Everything in this community that needs attention"
            : "Everything assigned to you"}
        </p>
      </div>
    </div>

    {!isCommunityAdmin && (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <InboxStatPill icon={BoltIcon} value={stats.action} label="Waiting on you" tone="brand" />
        <InboxStatPill icon={FireIcon} value={stats.overdue} label="Overdue" tone="red" />
        <InboxStatPill icon={ClockIcon} value={stats.waiting} label="In progress" tone="amber" />
        <InboxStatPill icon={CheckCircleIcon} value={stats.done} label="Cleared" tone="green" />
      </div>
    )}
  </div>
);

export const InboxHeader = React.memo(InboxHeaderComponent);
InboxHeader.displayName = "InboxHeader";
