"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import React, { type FC, useCallback, useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMilestoneActionItems } from "@/hooks/useMilestoneActionItems";
import type { IMilestoneActionItem } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";

const MS_PER_DAY = 86_400_000;

/** Today's calendar day in UTC, the same basis the follow-up date is stored in. */
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "today", "in 3 days" or "2 days ago", on UTC calendar days. */
function relativeDay(iso: string): string {
  const target = Date.parse(iso.slice(0, 10));
  const today = Date.parse(todayIsoDate());
  const delta = Math.round((target - today) / MS_PER_DAY);
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  if (delta === -1) return "yesterday";
  return delta > 0 ? `in ${delta} days` : `${-delta} days ago`;
}

/** True when an open item's follow-up date has already passed. */
function isFollowUpOverdue(item: IMilestoneActionItem): boolean {
  if (item.completedAt || !item.followUpAt) return false;
  return new Date(item.followUpAt).getTime() < Date.now();
}

interface ActionItemRowProps {
  item: IMilestoneActionItem;
  onToggle: (item: IMilestoneActionItem) => void;
  onDelete: (item: IMilestoneActionItem) => Promise<void>;
  isDeleting: boolean;
}

const ActionItemRowComponent: FC<ActionItemRowProps> = ({
  item,
  onToggle,
  onDelete,
  isDeleting,
}) => {
  const done = Boolean(item.completedAt);
  const overdue = isFollowUpOverdue(item);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <Checkbox
        checked={done}
        onCheckedChange={() => onToggle(item)}
        aria-label={done ? "Reopen action item" : "Mark action item done"}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "whitespace-pre-wrap break-words text-sm",
            done ? "text-gray-400 line-through dark:text-zinc-500" : "text-gray-900 dark:text-white"
          )}
        >
          {item.content}
        </p>

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
                UTC midnight. Local rendering shows the day before west of UTC.
              */}
              {overdue ? "Follow-up overdue" : "Next follow-up"} ·{" "}
              {formatDate(item.followUpAt, "UTC")} ({relativeDay(item.followUpAt)})
            </span>
          )}
          {done && item.completedAt && (
            <span className="text-gray-400 dark:text-zinc-500">
              Done {formatDate(item.completedAt, "UTC")}
            </span>
          )}
          <span className="text-gray-400 dark:text-zinc-500">
            Added {formatDate(item.createdAt, "UTC")} by{" "}
            {item.createdByName || shortAddress(item.createdByAddress)}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon-xs"
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
        externalIsOpen={confirmDelete}
        externalSetIsOpen={setConfirmDelete}
      />
    </li>
  );
};

const ActionItemRow = React.memo(ActionItemRowComponent);
ActionItemRow.displayName = "ActionItemRow";

interface MilestoneActionItemsProps {
  communityId: string;
  milestoneUid: string;
  /** Gate the fetch — the endpoints are community-admin only. */
  enabled?: boolean;
}

/**
 * The admin follow-up log for one milestone: free-form notes with an optional
 * next-follow-up date, checked off when the chase is resolved.
 *
 * The completion timestamp is stamped server-side; the checkbox only sends the
 * desired state. Deletion goes through `DeleteDialog` rather than a bare
 * button, per the destructive-action rule.
 */
const MilestoneActionItemsComponent: FC<MilestoneActionItemsProps> = ({
  communityId,
  milestoneUid,
  enabled = true,
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
    isDeleting,
  } = useMilestoneActionItems(communityId, milestoneUid, { enabled });

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
    if (!content) return;

    createItem({
      content,
      // A date input yields `YYYY-MM-DD`; the API expects a full ISO instant.
      followUpAt: draftFollowUp ? new Date(`${draftFollowUp}T00:00:00.000Z`).toISOString() : null,
    });
    resetDraft();
  }, [draft, draftFollowUp, createItem, resetDraft]);

  const handleToggle = useCallback(
    (item: IMilestoneActionItem) => {
      updateItem({ id: item.id, input: { completed: !item.completedAt } });
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

  return (
    <section className="rounded-lg bg-gray-50 p-4 dark:bg-zinc-800/60">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
          Action items
          {openCount > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              <span className="sr-only">, </span>
              {openCount} open {pluralize("item", openCount)}
            </span>
          )}
        </h3>
        {!isAdding && (
          <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="e.g. Emailed the team, no response yet"
            rows={2}
            aria-label="Action item note"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label
              htmlFor="action-item-follow-up"
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              Next follow-up
            </label>
            <Input
              id="action-item-follow-up"
              type="date"
              min={todayIsoDate()}
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
                disabled={!draft.trim() || isCreating}
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
      ) : items.length === 0 ? (
        <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
          No action items yet. Log a note when you reach out about this milestone.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
              isDeleting={isDeleting}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export const MilestoneActionItems = React.memo(MilestoneActionItemsComponent);
MilestoneActionItems.displayName = "MilestoneActionItems";
