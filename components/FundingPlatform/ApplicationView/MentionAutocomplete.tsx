"use client";

import { ExclamationTriangleIcon, PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { type FC, useMemo } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAllReviewers } from "@/hooks/useAllReviewers";
import { useAuth } from "@/hooks/useAuth";
import type { GranteeContact } from "@/hooks/useGranteeContacts";
import type { CaretPosition } from "@/hooks/useMentionEditor";
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
  /** Optional grantee contacts fetched from the application endpoint */
  granteeContacts?: GranteeContact[];
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
  granteeContacts,
}) => {
  const { data: reviewers, isLoading, isError, error, refetch } = useAllReviewers(programId);
  const { authenticated } = useAuth();

  const filteredReviewers = useMemo(() => {
    if (!reviewers) return [];
    if (!filterText) return reviewers;

    const lower = filterText.toLowerCase();
    return reviewers.filter(
      (r) => r.name.toLowerCase().includes(lower) || r.email.toLowerCase().includes(lower)
    );
  }, [reviewers, filterText]);

  const filteredGrantees = useMemo(() => {
    if (!granteeContacts) return [];
    if (!filterText) return granteeContacts;

    const lower = filterText.toLowerCase();
    return granteeContacts.filter(
      (g) =>
        g.name.toLowerCase().includes(lower) ||
        g.role.toLowerCase().includes(lower) ||
        g.email.toLowerCase().includes(lower)
    );
  }, [granteeContacts, filterText]);

  // Flat ordered list of selectable items for keyboard navigation:
  // reviewers first, then grantees, then invite button (if admin)
  const selectableItems = useMemo(() => {
    const reviewerItems = filteredReviewers.map((r) => ({ name: r.name, email: r.email }));
    const granteeItems = filteredGrantees.map((g) => ({ name: g.name, email: g.email }));
    return [...reviewerItems, ...granteeItems];
  }, [filteredReviewers, filteredGrantees]);

  if (!isOpen) return null;

  const hasAnyResults = filteredReviewers.length > 0 || filteredGrantees.length > 0;

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
              {!hasAnyResults && (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No results found.
                </div>
              )}

              {filteredReviewers.length > 0 && (
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
              )}

              {filteredGrantees.length > 0 && (
                <>
                  {filteredReviewers.length > 0 && <CommandSeparator />}
                  <CommandGroup heading="Grantees">
                    <TooltipProvider>
                      {filteredGrantees.map((grantee, granteeIndex) => {
                        const listIndex = filteredReviewers.length + granteeIndex;
                        const hasEmail = !!grantee.email;
                        const isDisabled = !hasEmail;

                        const itemContent = (
                          <div className="flex items-center gap-2 w-full">
                            <UserIcon
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isDisabled ? "text-gray-300 dark:text-gray-600" : "text-gray-400"
                              )}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span
                                className={cn(
                                  "text-sm font-medium truncate",
                                  isDisabled && "text-gray-400 dark:text-gray-500"
                                )}
                              >
                                {grantee.name}
                              </span>
                              <span
                                className={cn(
                                  "text-xs truncate",
                                  isDisabled
                                    ? "text-gray-300 dark:text-gray-600"
                                    : "text-gray-500 dark:text-gray-400"
                                )}
                              >
                                {grantee.role}
                                {!isDisabled && authenticated && ` · ${grantee.email}`}
                              </span>
                            </div>
                            {isDisabled && (
                              <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                            )}
                          </div>
                        );

                        return (
                          <Tooltip key={`${grantee.address}-${grantee.role}`}>
                            <TooltipTrigger asChild>
                              <CommandItem
                                value={grantee.name}
                                disabled={isDisabled}
                                onSelect={() => {
                                  if (!isDisabled) {
                                    onSelect({
                                      name: grantee.name,
                                      email: grantee.email,
                                    });
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-2 cursor-pointer",
                                  listIndex === selectedIndex && "bg-blue-50 dark:bg-blue-900/30",
                                  isDisabled && "opacity-60 cursor-not-allowed"
                                )}
                              >
                                {itemContent}
                              </CommandItem>
                            </TooltipTrigger>
                            {isDisabled && (
                              <TooltipContent side="right">
                                no email on file — mention will not notify
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                  </CommandGroup>
                </>
              )}

              {isAdmin && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={onInviteNew}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer text-blue-600 dark:text-blue-400",
                        selectedIndex === selectableItems.length && "bg-blue-50 dark:bg-blue-900/30"
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
