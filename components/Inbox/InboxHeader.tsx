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
  /** Human-readable reviewer role, e.g. "Application + Milestone reviewer". */
  role: string;
  stats: InboxStats;
}

const InboxHeaderComponent: FC<InboxHeaderProps> = ({ role, stats }) => (
  <div className="space-y-5">
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300">
        <InboxIcon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">Inbox</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Everything assigned to you ·{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">{role}</span>
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

export const InboxHeader = React.memo(InboxHeaderComponent);
InboxHeader.displayName = "InboxHeader";
