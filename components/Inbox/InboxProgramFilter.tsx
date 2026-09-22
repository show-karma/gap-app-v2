"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { useQueryState } from "nuqs";
import React, { type FC, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { cn } from "@/utilities/tailwind";

const ALL_PROGRAMS = "All programs";

/** Program ids may carry a chain suffix ("959_42161"); the filter keys on the bare id. */
function bareProgramId(value: string | null | undefined): string | null {
  return value ? (value.split("_")[0] ?? value) : null;
}

interface InboxProgramFilterProps {
  communityId: string;
}

/**
 * Program chip for the admin milestone queue. Same silhouette as the stage
 * chips beside it; the selection lives in the URL as `programId`, the key the
 * other manage pages use.
 */
const InboxProgramFilterComponent: FC<InboxProgramFilterProps> = ({ communityId }) => {
  const [open, setOpen] = useState(false);
  const { data: programs = [], isLoading } = useCommunityPrograms(communityId);
  const [programId, setProgramId] = useQueryState("programId", {
    parse: (value) => bareProgramId(value),
    serialize: (value) => bareProgramId(value) ?? "",
  });

  const options = useMemo(
    () =>
      programs
        .map((program) => ({
          id: bareProgramId(program.programId) ?? "",
          title: program.metadata?.title || program.name || program.programId,
        }))
        .filter((option) => option.id.length > 0)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [programs]
  );

  const selected = options.find((option) => option.id === programId) ?? null;
  const active = selected !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "outline"}
          size="chip"
          aria-pressed={active}
          aria-label={selected ? `Program: ${selected.title}` : "Filter by program"}
          disabled={isLoading || options.length === 0}
          className={cn(
            "max-w-[min(260px,calc(100vw-2rem))] font-medium focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            active && "border border-primary-500 text-primary-700 dark:text-primary-300"
          )}
        >
          <span className="truncate">{selected ? selected.title : ALL_PROGRAMS}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search programs" />
          <CommandList>
            <CommandEmpty>No program matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={ALL_PROGRAMS}
                onSelect={() => {
                  setProgramId(null);
                  setOpen(false);
                }}
              >
                <CheckIcon
                  className={cn("mr-2 h-4 w-4", active ? "opacity-0" : "opacity-100")}
                  aria-hidden="true"
                />
                {ALL_PROGRAMS}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={`${option.title} ${option.id}`}
                  onSelect={() => {
                    setProgramId(option.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.id === programId ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{option.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const InboxProgramFilter = React.memo(InboxProgramFilterComponent);
InboxProgramFilter.displayName = "InboxProgramFilter";
