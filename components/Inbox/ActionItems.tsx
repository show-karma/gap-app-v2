"use client";

import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import React, { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { NoteContent } from "@/components/Inbox/NoteContent";
import { NoteEditor } from "@/components/Inbox/NoteEditor";
import { subscribeOpenNote, takePendingNote } from "@/components/Inbox/noteNavigation";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { type ActionItemTarget, useActionItems } from "@/hooks/useActionItems";
import { useCommunityActionItems } from "@/hooks/useCommunityActionItems";
import type { ICommunityActionItem, IMilestoneActionItem } from "@/types/funding-platform";
import { describeRelativeDay, isBeforeToday, todayCalendarDay } from "@/utilities/calendarDay";
import { formatDate } from "@/utilities/formatDate";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";

/** A `type="date"` value (`YYYY-MM-DD`) is a calendar day; the API stores the
 * follow-up as UTC midnight, so convert both ways without shifting the day. */
function calendarDayToIso(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toISOString();
}

function isoToCalendarDay(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** True when an open item's follow-up day falls before the viewer's today. */
function isFollowUpOverdue(item: IMilestoneActionItem): boolean {
  if (item.completedAt) return false;
  return isBeforeToday(item.followUpAt);
}

interface ActionItemRowProps {
  item: IMilestoneActionItem;
  mentionOptions: ICommunityActionItem[];
  isLoadingMentions: boolean;
  /** Briefly singled out after a mention elsewhere pointed here. */
  highlighted: boolean;
  /** Lets the section warm the mention source before the editor opens. */
  onStartEdit: () => void;
  onToggle: (item: IMilestoneActionItem) => void;
  onUpdate: (id: string, input: { content: string; followUpAt: string }) => void;
  onDelete: (item: IMilestoneActionItem) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
}

const ActionItemRowComponent: FC<ActionItemRowProps> = ({
  item,
  mentionOptions,
  isLoadingMentions,
  highlighted,
  onStartEdit,
  onToggle,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}) => {
  const done = Boolean(item.completedAt);
  const overdue = isFollowUpOverdue(item);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [editFollowUp, setEditFollowUp] = useState(isoToCalendarDay(item.followUpAt));

  const startEdit = useCallback(() => {
    onStartEdit();
    setEditContent(item.content);
    setEditFollowUp(isoToCalendarDay(item.followUpAt));
    setIsEditing(true);
  }, [item.content, item.followUpAt, onStartEdit]);

  const cancelEdit = useCallback(() => setIsEditing(false), []);

  const saveEdit = useCallback(() => {
    const content = editContent.trim();
    if (!content || !editFollowUp) return;
    onUpdate(item.id, { content, followUpAt: calendarDayToIso(editFollowUp) });
    setIsEditing(false);
  }, [editContent, editFollowUp, onUpdate, item.id]);

  if (isEditing) {
    return (
      <li className="rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <NoteEditor
          value={editContent}
          onChange={setEditContent}
          mentionOptions={mentionOptions}
          isLoadingMentions={isLoadingMentions}
          excludeNoteId={item.id}
          aria-label="Action item note"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label
            htmlFor={`action-item-edit-follow-up-${item.id}`}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            Next follow-up <span className="text-red-500">*</span>
          </label>
          <Input
            id={`action-item-edit-follow-up-${item.id}`}
            type="date"
            required
            value={editFollowUp}
            onChange={(event) => setEditFollowUp(event.target.value)}
            className="h-8 w-auto"
          />
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveEdit}
              disabled={!editContent.trim() || !editFollowUp || isUpdating}
              isLoading={isUpdating}
            >
              Save
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      id={`action-item-${item.id}`}
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-white p-3 transition-colors duration-700 dark:bg-zinc-900",
        highlighted
          ? "border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20"
          : "border-gray-200 dark:border-zinc-700"
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={() => onToggle(item)}
        aria-label={done ? "Reopen action item" : "Mark action item done"}
        className="mt-0.5 h-5 w-5"
      />

      <div className="min-w-0 flex-1">
        <NoteContent
          content={item.content}
          className={
            done ? "text-gray-400 line-through dark:text-zinc-500" : "text-gray-900 dark:text-white"
          }
        />

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          {item.followUpAt && !done && (
            <span
              className={cn(
                overdue
                  ? "font-medium text-red-600 dark:text-red-400"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {/*
                A follow-up date is a calendar day the admin picked, stored as
                UTC midnight — so it is PRINTED in UTC (rendering it locally
                would show the day before west of UTC) but COMPARED against the
                viewer's local day. See utilities/calendarDay.
              */}
              {overdue ? "Follow-up overdue" : "Next follow-up"} ·{" "}
              {formatDate(item.followUpAt, "UTC")} ({describeRelativeDay(item.followUpAt)})
            </span>
          )}
          {done && item.completedAt && (
            <span className="text-gray-500 dark:text-zinc-400">
              Done {formatDate(item.completedAt, "UTC")}
            </span>
          )}
          <span className="text-gray-500 dark:text-zinc-400">
            Added {formatDate(item.createdAt, "UTC")} by{" "}
            {item.createdByName || shortAddress(item.createdByAddress)}
          </span>
        </div>
      </div>

      {!done && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Edit action item"
          onClick={startEdit}
          className="text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200"
        >
          <PencilIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete action item"
        onClick={() => setConfirmDelete(true)}
        className="text-gray-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
      >
        <TrashIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
      <DeleteDialog
        title="Delete this action item?"
        deleteFunction={() => onDelete(item)}
        isLoading={isDeleting}
        // The trash button above is the trigger. Without this, DeleteDialog
        // renders its own default trigger — labelled "Delete Project".
        buttonElement={null}
        externalIsOpen={confirmDelete}
        externalSetIsOpen={setConfirmDelete}
      />
    </li>
  );
};

const ActionItemRow = React.memo(ActionItemRowComponent);
ActionItemRow.displayName = "ActionItemRow";

const MENTION_SOURCE_FILTERS = { page: 1, status: "all" as const, limit: 100 };
const NO_NOTES: ICommunityActionItem[] = [];
const HIGHLIGHT_MS = 2500;

/** A dated fact from the item's own lifecycle, shown between the notes. */
export interface ActivityEvent {
  at: string;
  label: string;
  detail?: string;
  toneClass?: string;
}

interface ActionItemsProps {
  communityId: string;
  /** The milestone or application the log is attached to. */
  target: ActionItemTarget;
  /** Gate the fetch — the endpoints are community-admin only. */
  enabled?: boolean;
  /**
   * Lifecycle events to interleave with the notes, newest first, so the log
   * reads as one story: due date passed, admin chased, grantee replied.
   */
  events?: ActivityEvent[];
}

type ActivityEntry =
  | { kind: "note"; at: string; item: IMilestoneActionItem }
  | { kind: "event"; at: string; event: ActivityEvent };

const EventRow: FC<{ event: ActivityEvent }> = ({ event }) => (
  <li className="flex items-start gap-3 px-3 py-1.5">
    <span
      aria-hidden="true"
      className={cn(
        "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current",
        event.toneClass ?? "text-gray-400 dark:text-zinc-500"
      )}
    />
    <div className="min-w-0 flex-1 text-sm">
      <span className="mr-2 text-xs tabular-nums text-gray-500 dark:text-gray-400">
        {formatDate(event.at, "UTC")}
      </span>
      <span className={cn("font-medium", event.toneClass ?? "text-gray-700 dark:text-gray-200")}>
        {event.label}
      </span>
      {event.detail && (
        <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-300">
          {event.detail}
        </p>
      )}
    </div>
  </li>
);

/**
 * The admin follow-up log for one queue item: free-form notes with a required
 * next-follow-up date, checked off when the chase is resolved.
 *
 * The completion timestamp is stamped server-side; the checkbox only sends the
 * desired state. Deletion goes through `DeleteDialog` rather than a bare
 * button, per the destructive-action rule.
 */
const ActionItemsComponent: FC<ActionItemsProps> = ({
  communityId,
  target,
  enabled = true,
  events,
}) => {
  const {
    items,
    isLoading,
    error,
    refetch,
    createItem,
    updateItem,
    deleteItem,
    isCreating,
    isUpdating,
    isDeleting,
  } = useActionItems(communityId, target, { enabled });

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftFollowUp, setDraftFollowUp] = useState("");

  const resetDraft = useCallback(() => {
    setDraft("");
    setDraftFollowUp("");
    setIsAdding(false);
  }, []);

  const handleCreate = useCallback(() => {
    const content = draft.trim();
    if (!content || !draftFollowUp) return;

    createItem({
      content,
      followUpAt: calendarDayToIso(draftFollowUp),
    });
    resetDraft();
  }, [draft, draftFollowUp, createItem, resetDraft]);

  const handleToggle = useCallback(
    (item: IMilestoneActionItem) => {
      updateItem({ id: item.id, input: { completed: !item.completedAt } });
    },
    [updateItem]
  );

  const handleUpdate = useCallback(
    (id: string, input: { content: string; followUpAt: string }) => {
      updateItem({ id, input });
    },
    [updateItem]
  );

  const handleDelete = useCallback(
    async (item: IMilestoneActionItem) => {
      deleteItem(item.id);
    },
    [deleteItem]
  );

  const openCount = items.filter((item) => !item.completedAt).length;
  const isActivity = events !== undefined;

  // The "@" typeahead needs every note in the community. Fetched the first
  // time an editor opens, not on every panel visit.
  const [mentionSourceWanted, setMentionSourceWanted] = useState(false);
  const mentionSource = useCommunityActionItems(
    communityId,
    MENTION_SOURCE_FILTERS,
    enabled && mentionSourceWanted
  );
  const mentionOptions = mentionSource.data?.items ?? NO_NOTES;
  const openEditor = useCallback(() => {
    setMentionSourceWanted(true);
    setIsAdding(true);
  }, []);
  const startEditing = useCallback(() => setMentionSourceWanted(true), []);

  // A mention elsewhere asked for one of these notes: scroll to it and single
  // it out for a moment once it is on screen.
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIds = useMemo(() => items.map((item) => item.id), [items]);
  const highlight = useCallback((noteId: string) => {
    setHighlightedId(noteId);
    document
      .getElementById(`action-item-${noteId}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
  }, []);
  useEffect(() => {
    const pending = takePendingNote(noteIds);
    if (pending) highlight(pending);
  }, [noteIds, highlight]);
  useEffect(
    () =>
      subscribeOpenNote((request) => {
        if (noteIds.includes(request.noteId)) {
          takePendingNote(noteIds);
          highlight(request.noteId);
        }
      }),
    [noteIds, highlight]
  );
  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    []
  );

  const entries = useMemo<ActivityEntry[]>(() => {
    const notes: ActivityEntry[] = items.map((item) => ({
      kind: "note",
      at: item.createdAt,
      item,
    }));
    const facts: ActivityEntry[] = (events ?? []).map((event) => ({
      kind: "event",
      at: event.at,
      event,
    }));
    return [...notes, ...facts].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [items, events]);

  return (
    <section className="rounded-lg bg-gray-50 p-4 dark:bg-zinc-800/60">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
          {isActivity ? "Activity" : "Action items"}
          {openCount > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              <span className="sr-only">, </span>
              {openCount} open {pluralize("note", openCount)}
            </span>
          )}
        </h3>
        {!isAdding && (
          <Button variant="secondary" size="sm" onClick={openEditor}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Add note
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <NoteEditor
            value={draft}
            onChange={setDraft}
            mentionOptions={mentionOptions}
            isLoadingMentions={mentionSource.isLoading}
            placeholder="e.g. Emailed the team, no response yet. Type @ to mention another note"
            aria-label="Action item note"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label
              htmlFor="action-item-follow-up"
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              Next follow-up <span className="text-red-500">*</span>
            </label>
            <Input
              id="action-item-follow-up"
              type="date"
              required
              min={todayCalendarDay()}
              value={draftFollowUp}
              onChange={(event) => setDraftFollowUp(event.target.value)}
              className="h-8 w-auto"
            />
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={resetDraft}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!draft.trim() || !draftFollowUp || isCreating}
                isLoading={isCreating}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Couldn&apos;t load action items.
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
          No notes yet. Log one when you reach out about this{" "}
          {target.kind === "application" ? "application" : "milestone"}.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {entries.map((entry) =>
            entry.kind === "note" ? (
              <ActionItemRow
                key={entry.item.id}
                item={entry.item}
                mentionOptions={mentionOptions}
                isLoadingMentions={mentionSource.isLoading}
                highlighted={highlightedId === entry.item.id}
                onStartEdit={startEditing}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
              />
            ) : (
              <EventRow key={`${entry.event.label}-${entry.at}`} event={entry.event} />
            )
          )}
        </ul>
      )}
    </section>
  );
};

export const ActionItems = React.memo(ActionItemsComponent);
ActionItems.displayName = "ActionItems";
