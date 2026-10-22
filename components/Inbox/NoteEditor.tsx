"use client";

import React, { type FC, useCallback, useMemo, useRef } from "react";
import {
  filterNoteMentionOptions,
  NoteMentionAutocomplete,
} from "@/components/Inbox/NoteMentionAutocomplete";
import { Textarea } from "@/components/ui/textarea";
import { useNoteMentionEditor } from "@/hooks/useNoteMentionEditor";
import type { ICommunityActionItem } from "@/types/funding-platform";
import { noteMentionFromNote } from "@/utilities/noteMentions";

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Notes the "@" typeahead can offer. */
  mentionOptions: ICommunityActionItem[];
  isLoadingMentions: boolean;
  /** The note being edited, so it cannot mention itself. */
  excludeNoteId?: string;
  placeholder?: string;
  rows?: number;
  "aria-label": string;
}

/** The note textarea with "@" mentions of other notes. */
const NoteEditorComponent: FC<NoteEditorProps> = ({
  value,
  onChange,
  mentionOptions,
  isLoadingMentions,
  excludeNoteId,
  placeholder,
  rows = 2,
  "aria-label": ariaLabel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editor = useNoteMentionEditor(textareaRef, containerRef);

  const options = useMemo(
    () => filterNoteMentionOptions(mentionOptions, editor.filterText, excludeNoteId),
    [mentionOptions, editor.filterText, excludeNoteId]
  );

  const select = useCallback(
    (note: ICommunityActionItem) => {
      const mention = noteMentionFromNote(note);
      if (!mention) return;
      onChange(editor.pick(mention, value));
      textareaRef.current?.focus();
    },
    [editor, onChange, value]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const consumed = editor.handleKeyDown(event.key, options.length, (index) => {
        const note = options[index];
        if (note) select(note);
      });
      if (consumed) event.preventDefault();
    },
    [editor, options, select]
  );

  return (
    <div ref={containerRef} className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          editor.handleContentChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={editor.close}
        placeholder={placeholder}
        rows={rows}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={editor.isOpen}
      />
      <NoteMentionAutocomplete
        isOpen={editor.isOpen}
        filterText={editor.filterText}
        selectedIndex={editor.selectedIndex}
        caret={editor.caret}
        options={options}
        isLoading={isLoadingMentions}
        onSelect={select}
      />
    </div>
  );
};

export const NoteEditor = React.memo(NoteEditorComponent);
NoteEditor.displayName = "NoteEditor";
