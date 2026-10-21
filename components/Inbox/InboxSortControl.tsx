"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import React, { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ReviewerInboxSort } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface InboxSortControlProps {
  value: ReviewerInboxSort;
  onChange: (value: ReviewerInboxSort) => void;
}

const OPTIONS: { key: ReviewerInboxSort; label: string; hint: string }[] = [
  {
    key: "follow_up_date",
    label: "Follow-up date",
    hint: "Overdue follow-ups first, then soonest. No follow-up set sorts last",
  },
  {
    key: "priority",
    label: "Priority",
    hint: "Past due and awaiting review first, then longest stuck",
  },
];

/**
 * Ordering control for the community-admin queue: one dropdown that states
 * the current order. Two named modes rather than a field/direction pair,
 * since each mode has exactly one meaningful direction. The chosen mode is
 * passed to the server, which owns the ordering.
 */
const InboxSortControlComponent: FC<InboxSortControlProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((option) => option.key === value) ?? OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="chip"
          aria-label={`Sort by: ${current.label}`}
          className="font-medium focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <span className="text-gray-500 dark:text-gray-400">Sort</span>
          <span className="truncate">{current.label}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {OPTIONS.map((option) => (
                <CommandItem
                  key={option.key}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.key);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      option.key === value ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{option.hint}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const InboxSortControl = React.memo(InboxSortControlComponent);
InboxSortControl.displayName = "InboxSortControl";
