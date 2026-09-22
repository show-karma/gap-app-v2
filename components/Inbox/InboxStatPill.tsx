"use client";

import React, { type FC } from "react";
import { Button } from "@/components/ui/button";
import type { MilestoneAttentionReason } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

/** Visual tones for the Inbox header stat pills. */
type StatPillTone = "brand" | "red" | "amber" | "green";

const ICON_WRAP: Record<StatPillTone, string> = {
  brand: "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300",
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
  /** When set with `filterKey`, the pill acts as a filter toggle for its stage. */
  onToggle?: (key: MilestoneAttentionReason) => void;
  filterKey?: MilestoneAttentionReason;
  active?: boolean;
}

const InboxStatPillComponent: FC<InboxStatPillProps> = ({
  icon: Icon,
  value,
  label,
  tone,
  onToggle,
  filterKey,
  active = false,
}) => {
  const content = (
    <>
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
    </>
  );

  const surface = cn(
    "flex h-auto w-full items-center justify-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-left dark:bg-zinc-900",
    active ? "border-primary-500 ring-1 ring-primary-500" : "border-gray-200 dark:border-zinc-700"
  );

  if (!onToggle || !filterKey || value === 0) {
    return <div className={cn(surface, value === 0 && onToggle && "opacity-60")}>{content}</div>;
  }

  return (
    <Button
      variant="ghost"
      onClick={() => onToggle(filterKey)}
      aria-pressed={active}
      className={cn(
        surface,
        "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:hover:bg-zinc-800/70"
      )}
    >
      {content}
    </Button>
  );
};

export const InboxStatPill = React.memo(InboxStatPillComponent);
InboxStatPill.displayName = "InboxStatPill";
