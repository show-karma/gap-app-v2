"use client";

import React, { type FC, useMemo } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import type { NoteMentionCaret } from "@/hooks/useNoteMentionEditor";
import type { ICommunityActionItem } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { matchesNoteFilter, noteLocation, noteSnippet } from "@/utilities/noteMentions";
import { cn } from "@/utilities/tailwind";

export const NOTE_MENTION_MAX_OPTIONS = 8;

interface NoteMentionAutocompleteProps {
  isOpen: boolean;
  filterText: string;
  selectedIndex: number;
  caret: NoteMentionCaret | null;
  options: ICommunityActionItem[];
  isLoading: boolean;
  onSelect: (note: ICommunityActionItem) => void;
}

/**
 * Notes the admin can point at, narrowed by what they typed after "@". Each
 * row says where the note lives and how it starts, because a note has no
 * name of its own.
 */
export function filterNoteMentionOptions(
  notes: ICommunityActionItem[],
  filterText: string,
  excludeNoteId?: string
): ICommunityActionItem[] {
  return notes
    .filter((note) => note.id !== excludeNoteId && matchesNoteFilter(note, filterText))
    .slice(0, NOTE_MENTION_MAX_OPTIONS);
}

const NoteMentionAutocompleteComponent: FC<NoteMentionAutocompleteProps> = ({
  isOpen,
  filterText,
  selectedIndex,
  caret,
  options,
  isLoading,
  onSelect,
}) => {
  const empty = useMemo(() => !isLoading && options.length === 0, [isLoading, options.length]);
  if (!isOpen) return null;

  return (
    <div
      role="listbox"
      aria-label="Notes to mention"
      className="absolute z-50 w-80 max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={caret ? { top: caret.top, left: caret.left } : { top: "100%", left: 0 }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner className="h-4 w-4" />
        </div>
      ) : empty ? (
        <p className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
          {filterText ? `No notes match "${filterText}".` : "No other notes yet."}
        </p>
      ) : (
        <ul className="m-0 max-h-72 list-none overflow-y-auto p-1">
          {options.map((note, index) => {
            const active = index === selectedIndex;
            return (
              <li key={note.id}>
                <Button
                  type="button"
                  variant="ghost"
                  role="option"
                  aria-selected={active}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(note)}
                  className={cn(
                    "block h-auto w-full whitespace-normal rounded-md px-2 py-1.5 text-left",
                    active && "bg-gray-100 dark:bg-zinc-800"
                  )}
                >
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {noteLocation(note)}
                  </span>
                  <span className="block truncate text-xs text-gray-600 dark:text-gray-300">
                    {noteSnippet(note.content)}
                  </span>
                  <span className="block text-[11px] text-gray-400 dark:text-zinc-500">
                    {formatDate(note.createdAt)} · {note.completedAt ? "done" : "open"}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const NoteMentionAutocomplete = React.memo(NoteMentionAutocompleteComponent);
NoteMentionAutocomplete.displayName = "NoteMentionAutocomplete";
