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

/**
 * Ordering control for the community-admin queue.
 *
 * Deliberately two named modes rather than a field/direction pair: each mode
 * has exactly one meaningful direction (most urgent first, earliest chase
 * first), and offering "follow-up date, descending" would only ever surface
 * the least urgent work.
 *
 * Rendered as a connected segmented control on a recessed track, NOT as the
 * outlined chips used by the filters beside it. Both controls were the same
 * pill, so nothing distinguished "narrow the list" from "reorder the list" —
 * the only cue was a small "Sort by" label that is easy to skip past. A
 * segment sits inside its track; a filter chip sits on the surface.
 *
 * The chosen mode is passed to the server, which owns the ordering. Nothing
 * here re-sorts the feed client-side.
 */
const InboxSortControlComponent: FC<InboxSortControlProps> = ({ value, onChange }) => (
  <fieldset className="flex shrink-0 items-center gap-2 border-0 p-0">
    <legend className="sr-only">Sort by</legend>
    <span aria-hidden="true" className="text-xs font-medium text-gray-500 dark:text-gray-400">
      Sort
    </span>
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-zinc-800">
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
              "rounded-md font-medium focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
              active
                ? "bg-white text-gray-900 shadow-sm hover:bg-white dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-950"
                : "text-gray-500 hover:bg-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  </fieldset>
);

export const InboxSortControl = React.memo(InboxSortControlComponent);
InboxSortControl.displayName = "InboxSortControl";
