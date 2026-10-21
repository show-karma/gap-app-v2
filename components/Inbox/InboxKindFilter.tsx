"use client";

import React, { type FC } from "react";
import { Button } from "@/components/ui/button";
import type { IReviewerInboxStats, InboxKindFilter as Kind } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface InboxKindFilterProps {
  stats: IReviewerInboxStats;
  /** `null` = both streams. */
  value: Kind | null;
  onChange: (value: Kind | null) => void;
}

/**
 * Segmented control choosing which stream the admin queue shows. Counts come
 * from the full-feed stats so they hold steady while a stage filter is active.
 */
const InboxKindFilterComponent: FC<InboxKindFilterProps> = ({ stats, value, onChange }) => {
  const options: { key: Kind | null; label: string; count: number }[] = [
    { key: null, label: "All", count: stats.applications + stats.milestones },
    { key: "application", label: "Applications", count: stats.applications },
    { key: "milestone", label: "Milestones", count: stats.milestones },
  ];

  return (
    <fieldset
      aria-label="Item type"
      className="flex w-full rounded-lg bg-gray-100 p-1 dark:bg-zinc-800"
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Button
            key={option.key ?? "all"}
            type="button"
            variant="ghost"
            size="chip"
            onClick={() => onChange(option.key)}
            aria-pressed={active}
            className={cn(
              "flex-1 gap-1.5 whitespace-nowrap px-2 font-medium",
              active
                ? "bg-white text-gray-950 shadow-sm hover:bg-white dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-900"
                : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-zinc-700"
            )}
          >
            {option.label}
            <span
              className={cn(
                "tabular-nums text-xs",
                active ? "text-gray-500 dark:text-zinc-400" : "text-gray-400 dark:text-zinc-500"
              )}
            >
              {option.count}
            </span>
          </Button>
        );
      })}
    </fieldset>
  );
};

export const InboxKindFilter = React.memo(InboxKindFilterComponent);
InboxKindFilter.displayName = "InboxKindFilter";
