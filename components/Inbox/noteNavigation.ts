import type { ActionItemTarget } from "@/hooks/useActionItems";
/**
 * Following a note mention crosses component boundaries: the chip lives deep
 * in the Activity list, the queue selection lives on the page. A DOM event
 * carries the request up; the highlighted note id waits here until the
 * target item's Activity list has loaded and can scroll to it.
 */
export interface OpenNoteRequest {
  itemId: string;
  noteId: string;
}

export const OPEN_NOTE_EVENT = "inbox:open-note";

let pendingNoteId: string | null = null;

export function requestOpenNote(request: OpenNoteRequest): void {
  pendingNoteId = request.noteId;
  window.dispatchEvent(new CustomEvent<OpenNoteRequest>(OPEN_NOTE_EVENT, { detail: request }));
}

export function subscribeOpenNote(listener: (request: OpenNoteRequest) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<OpenNoteRequest>).detail);
  window.addEventListener(OPEN_NOTE_EVENT, handler);
  return () => window.removeEventListener(OPEN_NOTE_EVENT, handler);
}

/** Returns the note waiting to be highlighted if it is one of `noteIds`, and clears it. */
export function takePendingNote(noteIds: string[]): string | null {
  if (pendingNoteId && noteIds.includes(pendingNoteId)) {
    const taken = pendingNoteId;
    pendingNoteId = null;
    return taken;
  }
  return null;
}

export interface NoteDraftRequest {
  target: ActionItemTarget;
  content: string;
  /** Calendar day, YYYY-MM-DD. */
  followUpAt: string;
}

export const NOTE_DRAFT_EVENT = "inbox:note-draft";

export function requestNoteDraft(request: NoteDraftRequest): void {
  window.dispatchEvent(new CustomEvent<NoteDraftRequest>(NOTE_DRAFT_EVENT, { detail: request }));
}

export function subscribeNoteDraft(listener: (request: NoteDraftRequest) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<NoteDraftRequest>).detail);
  window.addEventListener(NOTE_DRAFT_EVENT, handler);
  return () => window.removeEventListener(NOTE_DRAFT_EVENT, handler);
}
