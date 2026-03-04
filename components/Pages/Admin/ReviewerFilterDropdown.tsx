"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "cmdk";
import { useMemo, useState } from "react";
import { ChevronDown } from "@/components/Icons/ChevronDown";
import type { CommunityReviewer } from "@/hooks/useCommunityMilestoneReviewers";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { cn } from "@/utilities/tailwind";

interface ReviewerFilterDropdownProps {
  reviewers: CommunityReviewer[];
  isLoading: boolean;
  selectedAddress: string | undefined;
  onSelect: (address: string | undefined) => void;
  currentUserAddress?: string;
}

export function getReviewerLabel(reviewer: CommunityReviewer, currentUserAddress?: string): string {
  const name = reviewer.name || formatAddressForDisplay(reviewer.publicAddress);
  if (
    currentUserAddress &&
    reviewer.publicAddress.toLowerCase() === currentUserAddress.toLowerCase()
  ) {
    return `${name} (You)`;
  }
  return name;
}

export function ReviewerFilterDropdown({
  reviewers,
  isLoading,
  selectedAddress,
  onSelect,
  currentUserAddress,
}: ReviewerFilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!selectedAddress) return "All Reviewers";
    const match = reviewers.find(
      (r) => r.publicAddress.toLowerCase() === selectedAddress.toLowerCase()
    );
    if (!match) return formatAddressForDisplay(selectedAddress);
    return getReviewerLabel(match, currentUserAddress);
  }, [selectedAddress, reviewers, currentUserAddress]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label="Filter by reviewer"
        className={cn(
          "min-w-40 max-w-max justify-between flex flex-row cursor-default rounded-md",
          "bg-white dark:bg-zinc-800 dark:text-zinc-100 py-2.5 px-4",
          "text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-zinc-600",
          "focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
        )}
        disabled={isLoading}
      >
        <div className="flex flex-row gap-4 w-full justify-between items-center">
          <span className="block truncate">{isLoading ? "Loading..." : selectedLabel}</span>
          <ChevronDown className="h-5 w-5 text-black dark:text-white flex-shrink-0" />
        </div>
      </Popover.Trigger>
      <Popover.Content
        align="start"
        className="mt-4 w-[var(--radix-popover-trigger-width)] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800 max-h-60 overflow-y-auto overflow-x-hidden py-2"
      >
        <Command>
          {reviewers.length > 5 && (
            <div className="w-full px-2">
              <CommandInput
                className="rounded-md px-2 w-full dark:text-white dark:bg-zinc-800"
                placeholder="Search reviewers..."
              />
            </div>
          )}
          <CommandEmpty className="px-4 py-2">No reviewers found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              value="all-reviewers"
              onSelect={() => {
                onSelect(undefined);
                setOpen(false);
              }}
              className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-between py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900 text-left"
            >
              <span className="font-semibold">All Reviewers</span>
              <CheckIcon
                className={cn("h-4 w-4 min-w-4 min-h-4 text-black dark:text-white", {
                  invisible: selectedAddress != null,
                })}
              />
            </CommandItem>
            {reviewers.map((reviewer) => {
              const isSelected =
                selectedAddress?.toLowerCase() === reviewer.publicAddress.toLowerCase();
              const label = getReviewerLabel(reviewer, currentUserAddress);
              return (
                <CommandItem
                  key={reviewer.publicAddress}
                  value={`${label} ${reviewer.publicAddress}`}
                  onSelect={() => {
                    onSelect(reviewer.publicAddress);
                    setOpen(false);
                  }}
                  className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-between py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900 text-left"
                >
                  <span>{label}</span>
                  <CheckIcon
                    className={cn("h-4 w-4 min-w-4 min-h-4 text-black dark:text-white", {
                      invisible: !isSelected,
                    })}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
}
