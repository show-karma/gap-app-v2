import type { ICommunityActionItem } from "@/types/funding-platform";

/**
 * A note can point at another note. The token keeps the label the admin saw
 * when they picked it, the note's id, and the queue item the note sits on, so
 * a reader can follow the link without any lookup:
 *
 *   @[Plumbline · Milestone 2: Cobrei o Masa…](note:<noteId>/<itemId>)
 */
export interface NoteMention {
  label: string;
  noteId: string;
  itemId: string;
  raw: string;
}

export type NoteSegment =
  | { type: "text"; text: string }
  | { type: "mention"; mention: NoteMention };

const NOTE_MENTION_PATTERN = /@\[([^\]]+)\]\(note:([^/\s)]+)\/([^\s)]+)\)/g;

const SNIPPET_LENGTH = 40;

export function parseNoteMentions(content: string): NoteMention[] {
  if (!content) return [];
  const pattern = new RegExp(NOTE_MENTION_PATTERN.source, NOTE_MENTION_PATTERN.flags);
  return Array.from(content.matchAll(pattern)).map((match) => ({
    label: match[1],
    noteId: match[2],
    itemId: match[3],
    raw: match[0],
  }));
}

/** Splits content into plain text and mention tokens, in document order. */
export function splitNoteMentions(content: string): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let cursor = 0;
  for (const mention of parseNoteMentions(content)) {
    const start = content.indexOf(mention.raw, cursor);
    if (start > cursor) segments.push({ type: "text", text: content.slice(cursor, start) });
    segments.push({ type: "mention", mention });
    cursor = start + mention.raw.length;
  }
  if (cursor < content.length) segments.push({ type: "text", text: content.slice(cursor) });
  return segments;
}

export function buildNoteMentionToken(mention: Omit<NoteMention, "raw">): string {
  const label = mention.label.replace(/[[\]]/g, " ").trim();
  return `@[${label}](note:${mention.noteId}/${mention.itemId})`;
}

/** What a mention looks like while the note is being written: "@Plumbline · M2: …". */
export function noteMentionDisplay(label: string): string {
  return `@${label}`;
}

/**
 * Replaces the "@filter" the admin was typing (from the last "@" before the
 * cursor up to the cursor) with the mention's display text, followed by a
 * space. The token is only produced when the note is saved.
 */
export function insertNoteMention(content: string, cursorPosition: number, label: string): string {
  const atIndex = content.slice(0, cursorPosition).lastIndexOf("@");
  if (atIndex === -1) return content;
  return `${content.slice(0, atIndex)}${noteMentionDisplay(label)} ${content.slice(cursorPosition)}`;
}

/** Stored content → what the textarea shows: every token becomes "@label". */
export function toDisplayContent(content: string): string {
  return splitNoteMentions(content)
    .map((segment) =>
      segment.type === "text" ? segment.text : noteMentionDisplay(segment.mention.label)
    )
    .join("");
}

/**
 * Textarea text → stored content: every "@label" the admin picked becomes
 * its token again. Longest labels first, so a label that contains another
 * is never split. Text that merely looks like a mention stays text.
 */
export function fromDisplayContent(
  display: string,
  known: Iterable<Omit<NoteMention, "raw">>
): string {
  const mentions = [...known].sort((a, b) => b.label.length - a.label.length);
  let content = display;
  for (const mention of mentions) {
    content = content.split(noteMentionDisplay(mention.label)).join(buildNoteMentionToken(mention));
  }
  return content;
}

/** First line of the note, trimmed to a readable length. */
export function noteSnippet(content: string): string {
  const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? "";
  const trimmed = firstLine.trim();
  return trimmed.length > SNIPPET_LENGTH ? `${trimmed.slice(0, SNIPPET_LENGTH - 1)}…` : trimmed;
}

/** "Plumbline · Milestone 2" — where the note lives, in the admin's words. */
export function noteLocation(note: ICommunityActionItem): string {
  const where = note.milestoneTitle ?? note.applicationTitle ?? "Application";
  return note.projectTitle ? `${note.projectTitle} · ${where}` : where;
}

/** The queue item a note sits on: a milestone uid or an application reference. */
export function noteTargetItemId(note: ICommunityActionItem): string | null {
  return note.milestoneUID ?? note.applicationReference ?? null;
}

export function noteMentionFromNote(note: ICommunityActionItem): Omit<NoteMention, "raw"> | null {
  const itemId = noteTargetItemId(note);
  if (!itemId) return null;
  return {
    label: `${noteLocation(note)}: ${noteSnippet(note.content)}`,
    noteId: note.id,
    itemId,
  };
}

/** Case-insensitive match on where the note lives and what it says. */
export function matchesNoteFilter(note: ICommunityActionItem, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  if (!needle) return true;
  return `${noteLocation(note)} ${note.content}`.toLowerCase().includes(needle);
}
