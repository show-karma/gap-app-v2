"use client";

import React, { type FC, useCallback, useMemo, useRef, useState } from "react";
import {
  filterNoteMentionOptions,
  NoteMentionAutocomplete,
} from "@/components/Inbox/NoteMentionAutocomplete";
import { Textarea } from "@/components/ui/textarea";
import { useNoteMentionEditor } from "@/hooks/useNoteMentionEditor";
import type { ICommunityActionItem } from "@/types/funding-platform";
import {
  fromDisplayContent,
  type NoteMention,
  noteMentionFromNote,
  parseNoteMentions,
  toDisplayContent,
} from "@/utilities/noteMentions";

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

type KnownMention = Omit<NoteMention, "raw">;

/**
 * The note textarea with "@" mentions of other notes. The parent holds the
 * stored form (tokens); the textarea shows "@label" instead, and every change
 * is mapped back through the mentions picked so far.
 */
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
  const [known, setKnown] = useState<Map<string, KnownMention>>(
    () => new Map(parseNoteMentions(value).map((mention) => [mention.label, mention]))
  );
  const display = useMemo(() => toDisplayContent(value), [value]);
  const commit = useCallback(
    (nextDisplay: string, mentions: Map<string, KnownMention> = known) =>
      onChange(fromDisplayContent(nextDisplay, mentions.values())),
    [onChange, known]
  );

  const options = useMemo(
    () => filterNoteMentionOptions(mentionOptions, editor.filterText, excludeNoteId),
    [mentionOptions, editor.filterText, excludeNoteId]
  );

  const select = useCallback(
    (note: ICommunityActionItem) => {
      const mention = noteMentionFromNote(note);
      if (!mention) return;
      const nextKnown = new Map(known).set(mention.label, mention);
      setKnown(nextKnown);
      commit(editor.pick(mention.label, display), nextKnown);
      textareaRef.current?.focus();
    },
    [editor, commit, display, known]
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
        value={display}
        onChange={(event) => {
          commit(event.target.value);
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
        onHighlight={editor.setSelectedIndex}
        onSelect={select}
      />
    </div>
  );
};

export const NoteEditor = React.memo(NoteEditorComponent);
NoteEditor.displayName = "NoteEditor";
