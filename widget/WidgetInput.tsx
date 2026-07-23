"use client";

import { CornerDownLeftIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, memo, useCallback, useEffect, useRef, useState } from "react";
import { CHAT_COMPOSER_LABEL } from "@/components/AgentChat/panel-dom";
import { Button } from "@/components/ui/button";
import type { ChatMention } from "@/store/agentChat";
import { cn } from "@/utilities/tailwind";
import {
  insertMentionAtCaret,
  isEditorEmpty,
  MENTION_DATA_ATTR,
  placeCaretAfter,
  serializeEditor,
} from "./WidgetInput.helpers";

interface WidgetInputProps {
  onSubmit: (text: string) => void;
  isStreaming: boolean;
  onStop?: () => void;
  placeholder?: string;
  /**
   * Mentions queued by external triggers (e.g. a "@-mention" button on a
   * milestone card). When this prop changes to a non-empty array, each
   * mention is inserted as an atomic inline pill at the current caret
   * position in the editor, then `onMentionsConsumed` fires so the host
   * can clear its queue. Chip data lives in the DOM after that.
   */
  mentions?: ChatMention[];
  onMentionsConsumed?: () => void;
}

export const WidgetInput = memo(function WidgetInput({
  onSubmit,
  isStreaming,
  onStop,
  placeholder = "Ask me anything...",
  mentions,
  onMentionsConsumed,
}: WidgetInputProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  // Drives the send button's disabled state without making the contenteditable
  // a controlled component. Synced from the live editor on input/insert/submit.
  const [isEmpty, setIsEmpty] = useState(true);
  const syncEmpty = useCallback(() => {
    const editor = editorRef.current;
    const empty = isEditorEmpty(editor);
    // contenteditable leaves stray <br>s after the user deletes all text,
    // which keeps `:empty` from matching and hides the placeholder. Clearing
    // the children when we know the editor is logically empty restores it.
    if (empty && editor && editor.childNodes.length > 0) {
      editor.replaceChildren();
    }
    setIsEmpty(empty);
  }, []);

  // Drain queued mentions: insert each one inline, then notify the host.
  // Skip mentions whose chip is already in the editor — once the host clears
  // its `pendingMentions` queue, a second click on the same trigger button
  // would otherwise re-insert a duplicate chip with the same id.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !mentions || mentions.length === 0) return;
    const existingIds = new Set(
      Array.from(editor.querySelectorAll(`[${MENTION_DATA_ATTR}]`))
        .map((el) => el.getAttribute(MENTION_DATA_ATTR))
        .filter((id): id is string => !!id)
    );
    for (const m of mentions) {
      if (existingIds.has(m.id)) continue;
      insertMentionAtCaret(editor, m);
      existingIds.add(m.id);
    }
    onMentionsConsumed?.();
    syncEmpty();
  }, [mentions, onMentionsConsumed, syncEmpty]);

  const submit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || isStreaming) return;
    const body = serializeEditor(editor);
    if (body.length === 0) return;
    onSubmit(body);
    editor.replaceChildren();
    setIsEmpty(true);
  }, [isStreaming, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      // Strip formatting on paste — only plain text reaches the editor.
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      placeCaretAfter(node);
      // Paste fires before `input`, so update isEmpty here too — otherwise
      // the send button stays disabled until the next keystroke.
      syncEmpty();
    },
    [syncEmpty]
  );

  const canSend = !isStreaming && !isEmpty;

  return (
    <div className="border-t border-border p-3">
      <div
        className={cn(
          "group/input flex w-full items-end gap-2 rounded-md border border-input bg-background px-2 py-1.5 shadow-xs",
          "transition-[color,box-shadow] focus-within:ring-1 focus-within:ring-ring",
          isStreaming && "opacity-60"
        )}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: contenteditable required for inline mention chips, which textarea cannot render */}
        <div
          ref={editorRef}
          role="textbox"
          tabIndex={0}
          aria-multiline="true"
          aria-label={CHAT_COMPOSER_LABEL}
          aria-disabled={isStreaming}
          contentEditable={!isStreaming}
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onInput={syncEmpty}
          data-placeholder={placeholder}
          className={cn(
            "flex-1 min-h-6 max-h-24 overflow-y-auto py-1.5 text-sm leading-6 outline-none",
            "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground",
            "[&:empty]:before:pointer-events-none whitespace-pre-wrap break-words"
          )}
        />
        {isStreaming ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onStop}
            aria-label="Stop generating"
          >
            <SquareIcon className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            size="icon-sm"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send message"
          >
            <CornerDownLeftIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
