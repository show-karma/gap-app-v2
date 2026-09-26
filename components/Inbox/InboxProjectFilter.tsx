"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import React, { type FC, useState } from "react";
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
import { useInboxProjectOptions } from "@/hooks/useInboxProjectOptions";
import { cn } from "@/utilities/tailwind";

interface InboxProjectFilterProps {
  communityId: string;
  programId: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
}

const ALL_PROJECTS = "All projects";

const InboxProjectFilterComponent: FC<InboxProjectFilterProps> = ({
  communityId,
  programId,
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const {
    data: options = [],
    isLoading,
    isError,
    refetch,
  } = useInboxProjectOptions(communityId, programId);
  const selected = options.find((option) => option.id === value);
  const active = Boolean(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "outline"}
          size="chip"
          aria-pressed={active}
          aria-label={selected ? `Project: ${selected.title}` : "Filter by project"}
          disabled={isLoading || (!active && options.length === 0 && !isError)}
          className={cn(
            "max-w-[min(260px,calc(100vw-2rem))] font-medium focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            active && "border border-primary-500 text-primary-700 dark:text-primary-300"
          )}
        >
          <span className="truncate">
            {selected?.title ?? (active ? "Selected project" : ALL_PROJECTS)}
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        {isError ? (
          <div className="space-y-2 p-3 text-sm text-gray-600 dark:text-gray-300">
            <p>Projects could not be loaded.</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Search projects" />
            <CommandList>
              <CommandEmpty>No project matches.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value={ALL_PROJECTS}
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn("mr-2 h-4 w-4", active ? "opacity-0" : "opacity-100")}
                    aria-hidden="true"
                  />
                  {ALL_PROJECTS}
                </CommandItem>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.title} ${option.id}`}
                    onSelect={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4",
                        option.id === value ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{option.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
};

export const InboxProjectFilter = React.memo(InboxProjectFilterComponent);
InboxProjectFilter.displayName = "InboxProjectFilter";
