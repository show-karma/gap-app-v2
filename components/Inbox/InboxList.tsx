"use client";

import pluralize from "pluralize";
import React, { type FC, useMemo } from "react";
import { InboxListItem } from "@/components/Inbox/InboxListItem";
import { ADMIN_BUCKET_LABEL, BUCKET_META, BUCKET_RANK } from "@/components/Inbox/statusToBucket";
import type { InboxItem, ReviewBucket } from "@/components/Inbox/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/utilities/tailwind";

/** Stream filter for the segmented Applications|Milestones toggle. */
export type InboxKindFilter = "all" | "application" | "milestone";

interface InboxListProps {
  items: InboxItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** When true, the caller reviews both streams, so the toggle may be offered. */
  hasBothRoles: boolean;
  /**
   * Community admins see the whole community's queue, not a personal
   * assignment list — "Assigned to you" would be a lie there.
   */
  isCommunityAdmin?: boolean;
  /** Feed total before pagination; when larger than the list, the label says "x of y". */
  totalCount?: number | null;
  kindFilter: InboxKindFilter;
  onKindFilterChange: (filter: InboxKindFilter) => void;
}

const BUCKET_DOT: Record<ReviewBucket, string> = {
  action: "bg-primary-500",
  waiting: "bg-amber-500",
  done: "bg-green-500",
};

const ORDERED_BUCKETS: ReviewBucket[] = (Object.keys(BUCKET_META) as ReviewBucket[]).sort(
  (a, b) => BUCKET_RANK[a] - BUCKET_RANK[b]
);

/**
 * Heading above the master list. It names the CONTENT, never the controls —
 * this used to read "Filter" for anyone holding both reviewer roles, which is
 * every community admin. An admin's feed spans the whole community, so it must
 * also not claim the items are assigned to them.
 */
function getListHeading(isCommunityAdmin: boolean): string {
  return isCommunityAdmin ? "Needs attention" : "Assigned to you";
}

/* ------------------------------------------------------------------ */
/* Bucket section label                                                */
/* ------------------------------------------------------------------ */
const BucketHeader: FC<{ bucket: ReviewBucket; count: number; isCommunityAdmin: boolean }> = ({
  bucket,
  count,
  isCommunityAdmin,
}) => (
  <div className="flex items-center gap-2 pb-2 pt-1">
    <span className={cn("h-2 w-2 rounded-full", BUCKET_DOT[bucket])} />
    <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">
      {isCommunityAdmin ? ADMIN_BUCKET_LABEL[bucket] : BUCKET_META[bucket].label}
    </h3>
    <span className="text-xs font-medium tabular-nums text-gray-500 dark:text-zinc-400">
      {count}
    </span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Segmented Applications|Milestones toggle                            */
/* ------------------------------------------------------------------ */
const KindToggle: FC<{
  value: InboxKindFilter;
  onChange: (filter: InboxKindFilter) => void;
  counts: { application: number; milestone: number };
}> = ({ value, onChange, counts }) => {
  // A segment with nothing behind it is a dead end: selecting it emptied the
  // list and offered no way back. Offer only streams that have items.
  const options: { key: InboxKindFilter; label: string }[] = [
    { key: "all", label: "All" },
    ...(counts.application > 0
      ? [{ key: "application" as const, label: `Applications (${counts.application})` }]
      : []),
    ...(counts.milestone > 0
      ? [{ key: "milestone" as const, label: `Milestones (${counts.milestone})` }]
      : []),
  ];

  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-zinc-800">
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={active}
            className={cn(
              "min-h-11 rounded-md px-3 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 xl:min-h-8",
              active
                ? "bg-white text-primary-700 shadow-sm dark:bg-zinc-900 dark:text-primary-300"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Fields every visible row shares. A value repeated on all 25 rows costs a
 * line of scanning per row and distinguishes nothing — when the queue is all
 * milestones from one program, "MILESTONE" and the program name are chrome.
 */
function findUniformFields(rows: InboxItem[]): { kind: boolean; subtitle: boolean } {
  if (rows.length < 2) return { kind: false, subtitle: false };
  const [first] = rows;
  return {
    kind: rows.every((row) => row.kind === first.kind),
    subtitle: Boolean(first.subtitle) && rows.every((row) => row.subtitle === first.subtitle),
  };
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */
const InboxListComponent: FC<InboxListProps> = ({
  items,
  selectedId,
  onSelect,
  hasBothRoles,
  isCommunityAdmin = false,
  totalCount = null,
  kindFilter,
  onKindFilterChange,
}) => {
  const counts = useMemo(
    () => ({
      application: items.filter((i) => i.kind === "application").length,
      milestone: items.filter((i) => i.kind === "milestone").length,
    }),
    [items]
  );

  const shown = useMemo(() => {
    if (!hasBothRoles || kindFilter === "all") return items;
    return items.filter((i) => i.kind === kindFilter);
  }, [items, hasBothRoles, kindFilter]);

  const uniform = useMemo(() => findUniformFields(shown), [shown]);

  const groups = useMemo(
    () =>
      ORDERED_BUCKETS.map((bucket) => ({
        bucket,
        list: shown.filter((i) => i.bucket === bucket),
      })).filter((group) => group.list.length > 0),
    [shown]
  );

  // Only worth a toggle when both streams actually have something in them.
  const showKindToggle = hasBothRoles && counts.application > 0 && counts.milestone > 0;

  const isTruncated = totalCount != null && totalCount > items.length && kindFilter === "all";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {getListHeading(isCommunityAdmin)}
        </h2>
        <span className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
          {isTruncated
            ? `Showing ${shown.length} of ${totalCount}`
            : `${shown.length} ${pluralize("item", shown.length)}`}
        </span>
      </div>

      {showKindToggle && (
        <div className="mb-3">
          <KindToggle value={kindFilter} onChange={onKindFilterChange} counts={counts} />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No {kindFilter === "application" ? "applications" : "milestones"} in this view.
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => onKindFilterChange("all")}
            className="mt-2 text-primary-700 dark:text-primary-300"
          >
            Show all items
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.bucket}>
              <BucketHeader
                bucket={group.bucket}
                count={group.list.length}
                isCommunityAdmin={isCommunityAdmin}
              />
              <div className="space-y-2.5">
                {group.list.map((item) => (
                  <InboxListItem
                    key={item.id}
                    item={item}
                    selected={item.id === selectedId}
                    onSelect={onSelect}
                    hideKind={uniform.kind}
                    hideSubtitle={uniform.subtitle}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const InboxList = React.memo(InboxListComponent);
InboxList.displayName = "InboxList";
