"use client";

import * as Popover from "@radix-ui/react-popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Check, ChevronDown } from "lucide-react";
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
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
          "active:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className="max-w-[150px] truncate">
          {isLoading ? "Loading..." : selectedOption?.name || "Ecosystem"}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 mt-1 w-[280px] rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          align="start"
          sideOffset={4}
        >
          <Command className="w-full">
            <CommandInput
              placeholder="Search ecosystem..."
              className="h-9 w-full rounded-md border-0 text-sm focus:ring-0 focus-visible:ring-0 focus:border-0 focus-visible:border-0"
            />
            <CommandList className="max-h-[300px] overflow-y-auto p-1">
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No ecosystem found.
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="any"
                  onSelect={() => handleSelect("any", "")}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  )}
                >
                  <span>All Ecosystems</span>
                  {!value && <Check className="h-4 w-4 text-primary" />}
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
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
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
