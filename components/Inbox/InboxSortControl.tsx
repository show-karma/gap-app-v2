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
    key: "priority",
    label: "Priority",
    hint: "Past due and awaiting review first, then longest stuck",
  },
  {
    key: "follow_up_date",
    label: "Follow-up date",
    hint: "Overdue follow-ups first, then soonest. No follow-up set sorts last",
  },
];

const InboxSortControlComponent: FC<InboxSortControlProps> = ({ value, onChange }) => (
  <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0">
    <legend className="sr-only">Sort by</legend>
    <span aria-hidden="true" className="text-xs font-medium text-gray-500 dark:text-gray-400">
      Sort by
    </span>
    {OPTIONS.map((option) => {
      const active = option.key === value;
      return (
        <Button
          key={option.key}
          type="button"
          variant={active ? "secondary" : "outline"}
          size="chip"
          aria-pressed={active}
          title={option.hint}
          onClick={() => onChange(option.key)}
          className={cn(
            "font-medium focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            active && "border border-primary-500 text-primary-700 dark:text-primary-300"
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
