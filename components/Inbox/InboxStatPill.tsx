"use client";

import React, { type FC } from "react";
import { cn } from "@/utilities/tailwind";

/** Visual tones for the Inbox header stat pills. */
export type StatPillTone = "brand" | "red" | "amber" | "green";

const ICON_WRAP: Record<StatPillTone, string> = {
  brand: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300",
  red: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300",
};

interface InboxStatPillProps {
  /** Heroicon component rendered inside the colored tile. */
  icon: FC<React.SVGProps<SVGSVGElement>>;
  /** The count to display. */
  value: number;
  /** Caption under the count. */
  label: string;
  tone: StatPillTone;
}

const InboxStatPillComponent: FC<InboxStatPillProps> = ({ icon: Icon, value, label, tone }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        ICON_WRAP[tone]
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <div className="text-xl font-bold leading-none tabular-nums text-gray-900 dark:text-white">
        {value}
      </div>
      <div className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  </div>
);

export const InboxStatPill = React.memo(InboxStatPillComponent);
InboxStatPill.displayName = "InboxStatPill";
