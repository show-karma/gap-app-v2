import type { ChatMention } from "@/store/agentChat";
import { mentionToToken } from "./mention-token";

export const MENTION_DATA_ATTR = "data-mention";
const MENTION_KIND_ATTR = "data-mention-kind";
const MENTION_PRIMARY_ID_ATTR = "data-mention-primary-id";
const MENTION_PARENT_SLUG_ATTR = "data-mention-parent-slug";
const MENTION_LABEL_ATTR = "data-mention-label";
// U+00A0 — the browser inserts real non-breaking spaces in contenteditable
// (trailing spaces, multi-space runs); strip them so the AI backend receives
// regular ASCII spaces.
const NBSP = "\u00A0";

export function buildMentionChip(mention: ChatMention): HTMLSpanElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.setAttribute(MENTION_DATA_ATTR, mention.id);
  span.setAttribute(MENTION_KIND_ATTR, mention.kind);
  span.setAttribute(MENTION_PRIMARY_ID_ATTR, mention.primaryId);
  if (mention.parentSlug) span.setAttribute(MENTION_PARENT_SLUG_ATTR, mention.parentSlug);
  span.setAttribute(MENTION_LABEL_ATTR, mention.label);
  span.className =
    "inline-flex items-center align-baseline rounded-full bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 mx-0.5 text-xs font-medium select-none cursor-default";
  span.textContent = `@${mention.label}`;
  return span;
}

function chipToMention(el: HTMLElement): ChatMention | null {
  const id = el.getAttribute(MENTION_DATA_ATTR);
  const kind = el.getAttribute(MENTION_KIND_ATTR) as ChatMention["kind"] | null;
  const primaryId = el.getAttribute(MENTION_PRIMARY_ID_ATTR);
  const label = el.getAttribute(MENTION_LABEL_ATTR);
  if (!id || !kind || !primaryId || !label) return null;
  const parentSlug = el.getAttribute(MENTION_PARENT_SLUG_ATTR) ?? undefined;
  return { id, kind, primaryId, label, parentSlug };
}

export function placeCaretAfter(node: Node) {
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
export function insertMentionAtCaret(editor: HTMLDivElement, mention: ChatMention) {
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
 * Mention chips emit their structured token (visible label + agent handle);
 * their visible @label children are skipped. <br>/block boundaries become
 * newlines. */
export function serializeEditor(editor: HTMLDivElement): string {
  let out = "";
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.nodeValue ?? "").replace(new RegExp(NBSP, "g"), " ");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.hasAttribute(MENTION_DATA_ATTR)) {
      const mention = chipToMention(el);
      if (mention) out += mentionToToken(mention);
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

export function isEditorEmpty(editor: HTMLDivElement | null): boolean {
  if (!editor) return true;
  if (editor.querySelector(`[${MENTION_DATA_ATTR}]`)) return false;
  return editor.textContent?.trim().length === 0;
}
