"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import React, { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { IReviewerInboxStats, InboxKindFilter as Kind } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface InboxKindFilterProps {
  stats: IReviewerInboxStats;
  /** `null` = both streams. */
  value: Kind | null;
  onChange: (value: Kind | null) => void;
}

const ALL_LABEL = "All types";

/**
 * Which stream the admin queue shows, as the same select-style control the
 * Stage, Program and Project rows use, so the Filters menu reads as one
 * column of like controls. Counts come from the full-feed stats so they hold
 * steady while a stage filter is active.
 */
const InboxKindFilterComponent: FC<InboxKindFilterProps> = ({ stats, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const options: { key: Kind | null; label: string; count: number }[] = [
    { key: null, label: ALL_LABEL, count: stats.applications + stats.milestones },
    { key: "application", label: "Applications", count: stats.applications },
    { key: "milestone", label: "Milestones", count: stats.milestones },
  ];
  const selected = options.find((option) => option.key === value) ?? options[0];
  const active = selected.key !== null;

  const choose = (next: Kind | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "outline"}
          size="chip"
          aria-label={`Filter by type: ${selected.label}`}
          className={cn(
            "font-medium focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            active && "border border-primary-500 text-primary-700 dark:text-primary-300"
          )}
        >
          <span className="truncate">{selected.label}</span>
          <span className="ml-auto shrink-0 tabular-nums text-xs text-gray-500 dark:text-zinc-400">
            {selected.count}
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.key ?? "all"}
                  value={option.label}
                  onSelect={() => choose(option.key)}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      option.key === value ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{option.label}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-xs text-gray-500 dark:text-zinc-400">
                    {option.count}
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

export const InboxKindFilter = React.memo(InboxKindFilterComponent);
InboxKindFilter.displayName = "InboxKindFilter";
