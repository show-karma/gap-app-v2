"use client";

import { CornerDownLeftIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, memo, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ChatMention } from "@/store/agentChat";
import { cn } from "@/utilities/tailwind";

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

const MENTION_DATA_ATTR = "data-mention";
const MENTION_REF_TEXT_ATTR = "data-mention-ref-text";
const NBSP = " ";

function buildMentionChip(mention: ChatMention): HTMLSpanElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.setAttribute(MENTION_DATA_ATTR, mention.id);
  span.setAttribute(MENTION_REF_TEXT_ATTR, mention.refText);
  span.className =
    "inline-flex items-center align-baseline rounded-full bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 mx-0.5 text-xs font-medium select-none cursor-default";
  span.textContent = `@${mention.label}`;
  return span;
}

function placeCaretAfter(node: Node) {
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Insert a chip at the current caret if the caret is inside `editor`,
 * otherwise append it to the end of `editor`. Always followed by a single
 * trailing space so the user can keep typing immediately. */
function insertMentionAtCaret(editor: HTMLDivElement, mention: ChatMention) {
  const sel = window.getSelection();
  const chip = buildMentionChip(mention);
  const space = document.createTextNode(" ");

  const rangeIsInside =
    sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).startContainer as Node);

  if (rangeIsInside && sel) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(chip);
    chip.after(space);
    placeCaretAfter(space);
  } else {
    editor.appendChild(chip);
    editor.appendChild(space);
    editor.focus();
    placeCaretAfter(space);
  }
}

/** Recursively walk the editor and produce the message body to send.
 * Mention chips emit their `refText` and their visible @label children are
 * skipped; everything else becomes plain text. <br>/block boundaries become
 * newlines. */
function serializeEditor(editor: HTMLDivElement): string {
  let out = "";
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.nodeValue ?? "").replace(new RegExp(NBSP, "g"), " ");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.hasAttribute(MENTION_DATA_ATTR)) {
      out += el.getAttribute(MENTION_REF_TEXT_ATTR) ?? "";
      return;
    }
    if (el.tagName === "BR") {
      out += "\n";
      return;
    }
    const isBlock = el.tagName === "DIV" || el.tagName === "P";
    if (isBlock && out && !out.endsWith("\n")) out += "\n";
    el.childNodes.forEach(visit);
  };
  editor.childNodes.forEach(visit);
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isEditorEmpty(editor: HTMLDivElement | null): boolean {
  if (!editor) return true;
  if (editor.querySelector(`[${MENTION_DATA_ATTR}]`)) return false;
  return editor.textContent?.trim().length === 0;
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
  // Re-renders are cheap; a single `version` tick lets the send button reflect
  // emptiness without making the contenteditable a controlled component.
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Drain queued mentions: insert each one inline, then notify the host.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !mentions || mentions.length === 0) return;
    for (const m of mentions) insertMentionAtCaret(editor, m);
    onMentionsConsumed?.();
    bump();
  }, [mentions, onMentionsConsumed, bump]);

  const submit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || isStreaming) return;
    const body = serializeEditor(editor);
    if (body.length === 0) return;
    onSubmit(body);
    editor.innerHTML = "";
    bump();
  }, [isStreaming, onSubmit, bump]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
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
  }, []);

  const canSend = !isStreaming && !isEditorEmpty(editorRef.current);

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
          aria-label="Chat message"
          aria-disabled={isStreaming}
          contentEditable={!isStreaming}
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onInput={bump}
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

export const __test = { serializeEditor, buildMentionChip, insertMentionAtCaret, isEditorEmpty };
