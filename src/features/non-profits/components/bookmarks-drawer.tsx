"use client";

/**
 * BookmarksDrawer — research tray slide-over panel.
 *
 * Ported from grant-atlas research-workbench/research-tray.tsx (BookmarksDrawer).
 * Reads tray items from React Query cache via useResearchTray().
 * Writes use useRemoveFromResearchTray / useClearResearchTray (optimistic mutations).
 */

import { Building2, ChevronRight, HandCoins, Landmark, X } from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import type React from "react";
import { memo } from "react";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import {
  useClearResearchTray,
  useRemoveFromResearchTray,
  useResearchTray,
} from "../hooks/use-research-tray";
import type { ResearchTrayEntry } from "../services/research-tray.service";
import type { PhilanthropyEntityType } from "../types/philanthropy";

// ── Constants ────────────────────────────────────────────────────────────────

const ENTITY_ICON_MAP: Record<PhilanthropyEntityType, React.ElementType> = {
  foundation: Landmark,
  nonprofit: Building2,
  grant: HandCoins,
};

const ENTITY_COLOR_MAP: Record<PhilanthropyEntityType, string> = {
  foundation: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  nonprofit: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  grant: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const VALID_ENTITY_TYPES = new Set<PhilanthropyEntityType>(["foundation", "nonprofit", "grant"]);

function isValidEntityType(type: string): type is PhilanthropyEntityType {
  return VALID_ENTITY_TYPES.has(type as PhilanthropyEntityType);
}

function getEntityHref(entry: ResearchTrayEntry): string {
  switch (entry.entityType) {
    case "foundation":
      return NON_PROFITS_PAGES.FOUNDATION(entry.entityId);
    case "nonprofit":
      return NON_PROFITS_PAGES.NONPROFIT(entry.entityId);
    case "grant":
      return NON_PROFITS_PAGES.GRANT(entry.entityId);
    default:
      return NON_PROFITS_PAGES.HOME;
  }
}

// ── TrayItem ─────────────────────────────────────────────────────────────────

const TrayItem = memo(function TrayItem({ entry }: { entry: ResearchTrayEntry }) {
  const { mutate: removeEntry } = useRemoveFromResearchTray();
  const validType = isValidEntityType(entry.entityType);
  const Icon = validType ? ENTITY_ICON_MAP[entry.entityType as PhilanthropyEntityType] : Landmark;
  const colorClass = validType
    ? ENTITY_COLOR_MAP[entry.entityType as PhilanthropyEntityType]
    : "bg-zinc-100 text-zinc-500";
  const href = getEntityHref(entry);
  const displayName = entry.name ?? "Untitled";

  return (
    <div className="flex h-16 items-center gap-3 border-b border-zinc-100 px-4 dark:border-zinc-800">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="block truncate text-sm font-medium text-zinc-800 hover:text-blue-600 dark:text-zinc-200 dark:hover:text-blue-400"
          title={displayName}
        >
          {displayName}
        </Link>
        <p className="text-xs capitalize text-zinc-400">{entry.entityType}</p>
      </div>
      <button
        type="button"
        aria-label={`Remove ${displayName} from bookmarks`}
        onClick={() => removeEntry(entry.id)}
        className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
});

// ── BookmarksDrawer ──────────────────────────────────────────────────────────

export function BookmarksDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: items = [], isLoading, isError } = useResearchTray();
  const { mutate: clearAll, isPending: isClearing } = useClearResearchTray();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Bookmarks"
        aria-modal="true"
        className={`fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-zinc-200 bg-white shadow-xl transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bookmarks</h2>
            {!isLoading && !isError && (
              <p className="text-xs text-zinc-400">
                {items.length === 0
                  ? "Save entities to compare"
                  : `${items.length} ${pluralize("item", items.length)} saved`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => clearAll()}
                disabled={isClearing}
                className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close bookmarks"
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Failed to load bookmarks.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                <Landmark className="size-6 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No bookmarks yet.</p>
              <p className="mt-1 text-xs text-zinc-400">Click the bookmark icon on any result.</p>
            </div>
          ) : (
            <div>
              {items.map((entry) => (
                <TrayItem key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {items.length > 0 && (
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-emphasis focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
            >
              {pluralize("item", items.length, true)} saved
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
