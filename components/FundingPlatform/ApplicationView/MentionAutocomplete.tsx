"use client";

import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { type FC, useMemo } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { CaretPosition } from "@/hooks/useMentionEditor";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { cn } from "@/utilities/tailwind";

interface MentionAutocompleteProps {
  programId: string;
  isOpen: boolean;
  filterText: string;
  isAdmin: boolean;
  selectedIndex: number;
  caretPosition: CaretPosition | null;
  onSelect: (reviewer: { name: string; email: string }) => void;
  onInviteNew: () => void;
  onClose: () => void;
}

const MentionAutocomplete: FC<MentionAutocompleteProps> = ({
  programId,
  isOpen,
  filterText,
  isAdmin,
  selectedIndex,
  caretPosition,
  onSelect,
  onInviteNew,
}) => {
  const { data: reviewers, isLoading, isError, error, refetch } = useMilestoneReviewers(programId);

  const filteredReviewers = useMemo(() => {
    if (!reviewers) return [];
    if (!filterText) return reviewers;

    const lower = filterText.toLowerCase();
    return reviewers.filter(
      (r) => r.name.toLowerCase().includes(lower) || r.email.toLowerCase().includes(lower)
    );
  }, [reviewers, filterText]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute w-72 z-[100]"
      style={
        caretPosition
          ? { top: caretPosition.top, left: caretPosition.left }
          : { top: "100%", left: 0 }
      }
    >
      <Command
        shouldFilter={false}
        className={cn(
          "rounded-lg border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-zinc-900 shadow-lg"
        )}
      >
        <CommandList>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner className="h-4 w-4" />
            </div>
          ) : isError ? (
            <div className="px-3 py-3 text-center">
              <p className="text-sm text-red-500">
                {error instanceof Error ? error.message : "Failed to load reviewers"}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <CommandEmpty>No reviewers found.</CommandEmpty>
              <CommandGroup heading="Reviewers">
                {filteredReviewers.map((reviewer, index) => (
                  <CommandItem
                    key={reviewer.email}
                    value={reviewer.name}
                    onSelect={() => {
                      onSelect({
                        name: reviewer.name,
                        email: reviewer.email,
                      });
                    }}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      index === selectedIndex && "bg-blue-50 dark:bg-blue-900/30"
                    )}
                  >
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{reviewer.name}</span>
                      <span className="text-xs text-gray-500">{reviewer.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {isAdmin && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={onInviteNew}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer text-blue-600 dark:text-blue-400",
                        selectedIndex === filteredReviewers.length &&
                          "bg-blue-50 dark:bg-blue-900/30"
                      )}
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Invite new reviewer</span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export default MentionAutocomplete;
