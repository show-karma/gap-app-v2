"use client";

/**
 * SearchHistoryPanel — dropdown/panel listing recent searches.
 *
 * Renders from the workbench header. Uses useSearchHistoryList() for data,
 * useDeleteSearchHistoryEntry() for per-row delete, useClearSearchHistory()
 * for clear-all (behind a DeleteDialog confirmation).
 */

import { Clock, Trash2, X } from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import { memo, useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import {
  useClearSearchHistory,
  useDeleteSearchHistoryEntry,
  useSearchHistoryList,
} from "../hooks/use-search-history";
import type { SearchHistoryEntry } from "../services/search-history.service";

// ── HistoryRow ───────────────────────────────────────────────────────────────

const HistoryRow = memo(function HistoryRow({ entry }: { entry: SearchHistoryEntry }) {
  const { mutate: deleteEntry, isPending } = useDeleteSearchHistoryEntry();
  const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <Clock className="size-3.5 shrink-0 text-zinc-400" />
      <Link
        href={NON_PROFITS_PAGES.SEARCH(entry.id)}
        className="min-w-0 flex-1 truncate text-sm text-zinc-700 hover:text-brand dark:text-zinc-300 dark:hover:text-brand-subtle"
        title={entry.query}
      >
        {entry.query}
      </Link>
      <span className="shrink-0 text-[11px] text-zinc-400">{date}</span>
      <button
        type="button"
        aria-label={`Delete search: ${entry.query}`}
        onClick={() => deleteEntry(entry.id)}
        disabled={isPending}
        className="shrink-0 rounded p-0.5 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 disabled:opacity-50 dark:hover:text-red-400"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
});

// ── SearchHistoryPanel ───────────────────────────────────────────────────────

export function SearchHistoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: entries = [], isLoading, isError } = useSearchHistoryList();
  const { mutateAsync: clearAll, isPending: isClearing } = useClearSearchHistory();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden />

      {/* Panel — positioned relative to trigger via parent; adjust as needed */}
      <div
        role="dialog"
        aria-label="Search history"
        className="absolute left-0 top-full z-40 mt-1 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Recent {pluralize("search", entries.length)}
          </span>
          <div className="flex items-center gap-1.5">
            {entries.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                disabled={isClearing}
                aria-label="Clear all search history"
                className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-red-400"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search history"
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-72 overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            </div>
          ) : isError ? (
            <p className="px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Failed to load history.
            </p>
          ) : entries.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No recent searches yet.
            </p>
          ) : (
            entries.map((entry) => <HistoryRow key={entry.id} entry={entry} />)
          )}
        </div>
      </div>

      {/* Clear-all confirmation */}
      <DeleteDialog
        title="Clear all search history?"
        deleteFunction={() => clearAll()}
        isLoading={isClearing}
        buttonElement={null}
        externalIsOpen={confirmClearOpen}
        externalSetIsOpen={setConfirmClearOpen}
        afterFunction={onClose}
      />
    </>
  );
}
