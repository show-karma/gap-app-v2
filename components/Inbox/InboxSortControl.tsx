"use client";

import React, { type FC } from "react";
import { Button } from "@/components/ui/button";
import type { ReviewerInboxSort } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface InboxSortControlProps {
  value: ReviewerInboxSort;
  onChange: (value: ReviewerInboxSort) => void;
}

const OPTIONS: { key: ReviewerInboxSort; label: string; hint: string }[] = [
  {
    key: "follow_up_date",
    label: "Next follow-up",
    hint: "Overdue follow-ups first, then soonest. No follow-up set sorts last",
  },
  {
    key: "priority",
    label: "Priority",
    hint: "Overdue and in review first, then longest stuck",
  },
];

/**
 * Ordering control for the community-admin queue: two named modes on one
 * segmented track, each with exactly one meaningful direction. Lives inside
 * the Filters menu under an "Order" label. The chosen mode is passed to the
 * server, which owns the ordering; nothing here re-sorts client-side.
 */
const InboxSortControlComponent: FC<InboxSortControlProps> = ({ value, onChange }) => (
  <fieldset
    aria-label="Order"
    className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-zinc-800"
  >
    {OPTIONS.map((option) => {
      const active = option.key === value;
      return (
        <Button
          key={option.key}
          type="button"
          variant="ghost"
          size="chip"
          aria-pressed={active}
          title={option.hint}
          onClick={() => onChange(option.key)}
          className={cn(
            "flex-1 rounded-md font-medium focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
            active
              ? "bg-white text-gray-900 shadow-sm hover:bg-white dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-950"
              : "text-gray-500 hover:bg-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          )}
        >
          {option.label}
        </Button>
      );
    })}
  </fieldset>
);

export const InboxSortControl = React.memo(InboxSortControlComponent);
InboxSortControl.displayName = "InboxSortControl";
