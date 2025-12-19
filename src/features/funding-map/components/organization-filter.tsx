"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { useMemo, useState } from "react";
import { cn } from "@/utilities/tailwind";
import type { OrganizationFilterValue } from "../hooks/use-funding-filters";
import { useOrganizationFilters } from "../hooks/use-funding-programs";

/**
 * Sanitize a string for use as a cmdk value (used in CSS selectors)
 * Removes special characters that break querySelector
 * Note: Only allow regular spaces (not \s which includes newlines/tabs)
 */
function sanitizeForSelector(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9 \-_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean organization name by removing surrounding quotes and extra whitespace
 */
function cleanDisplayName(name: string): string {
  return name.replace(/^["'\s]+|["'\s]+$/g, "").trim();
}

interface OrganizationFilterProps {
  value: OrganizationFilterValue | null;
  onChange: (value: OrganizationFilterValue | null) => void;
}

export function OrganizationFilter({ value, onChange }: OrganizationFilterProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useOrganizationFilters();

  // Sort options alphabetically by cleaned name (ascending)
  const sortedOptions = useMemo(() => {
    if (!data?.options) return [];
    return [...data.options].sort((a, b) =>
      cleanDisplayName(a.name).localeCompare(cleanDisplayName(b.name), undefined, {
        sensitivity: "base",
      })
    );
  }, [data?.options]);

  // Find selected option for display (compare original IDs)
  const selectedOption = useMemo(() => {
    if (!value || !data?.options) return null;
    const option = data.options.find((opt) => opt.type === value.type && opt.id === value.id);
    if (option) {
      return { ...option, name: cleanDisplayName(option.name) };
    }
    return null;
  }, [value, data?.options]);

  const handleSelect = (optionType: string, optionId: string) => {
    if (optionType === "any") {
      onChange(null);
    } else if (optionType === "community" || optionType === "organization") {
      // Use the original ID for API queries (backend needs exact match)
      onChange({ type: optionType, id: optionId });
    }
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={isLoading}
        className={cn(
          "h-8 flex items-center gap-1 rounded-lg px-2.5 text-sm shadow-sm",
          "bg-background border border-input hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className="text-muted-foreground">Organization:</span>
        <span className="max-w-[150px] truncate">
          {isLoading ? "Loading..." : selectedOption?.name || "Any"}
        </span>
        <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 mt-1 w-[280px] rounded-md border border-border bg-popover text-popover-foreground shadow-md"
          align="start"
          sideOffset={4}
        >
          <Command className="w-full">
            <CommandInput
              placeholder="Search organization..."
              className="h-9 w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <CommandList className="max-h-[300px] overflow-y-auto p-1">
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No organization found.
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="any"
                  onSelect={() => handleSelect("any", "")}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  )}
                >
                  <CheckIcon className={cn("h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  <span>Any</span>
                </CommandItem>
                {sortedOptions.map((option) => {
                  const isSelected = value?.type === option.type && value?.id === option.id;
                  return (
                    <CommandItem
                      key={`${option.type}:${option.id}`}
                      value={sanitizeForSelector(`${option.name} ${option.type}`)}
                      onSelect={() => handleSelect(option.type, option.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      )}
                    >
                      <CheckIcon
                        className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      {option.imageUrl && (
                        <img
                          src={option.imageUrl}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded-full object-cover"
                        />
                      )}
                      <span className="flex-1 truncate">{cleanDisplayName(option.name)}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        ({option.programCount})
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
