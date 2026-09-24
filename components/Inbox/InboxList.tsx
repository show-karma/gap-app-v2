"use client";

import pluralize from "pluralize";
import React, { type FC, useMemo } from "react";
import { InboxListItem } from "@/components/Inbox/InboxListItem";
import { partitionByFollowUp } from "@/components/Inbox/stageAge";
import { ADMIN_BUCKET_LABEL, BUCKET_META, BUCKET_RANK } from "@/components/Inbox/statusToBucket";
import type { InboxItem, ReviewBucket } from "@/components/Inbox/types";
import { Button } from "@/components/ui/button";
import type { ReviewerInboxSort } from "@/types/funding-platform";
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
  /**
   * Ordering the server applied. Under `follow_up_date` the list renders FLAT:
   * re-grouping by bucket would scatter a global date order across three
   * sections, leaving an order the reader cannot follow.
   */
  sort?: ReviewerInboxSort;
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
function getListHeading(isCommunityAdmin: boolean, byFollowUp: boolean): string {
  if (!isCommunityAdmin) return "Assigned to you";
  return byFollowUp ? "Overdue follow-ups first" : "Needs attention";
}

/**
 * Marks where a follow-up-ordered list runs out of dates.
 *
 * Undated items sort last however long they have been stuck, so without this
 * boundary a milestone stuck 378 days sitting below one stuck 44 days reads as
 * a broken sort instead of "nobody has scheduled a chase for it".
 */
const NoFollowUpDivider: FC<{ count: number }> = ({ count }) => (
  <div className="flex items-center gap-2 border-y border-gray-100 bg-gray-50 px-4 py-1.5 dark:border-zinc-800 dark:bg-zinc-800/40">
    <h3 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">No follow-up set</h3>
    <span className="h-px flex-1 bg-gray-200 dark:bg-zinc-700" aria-hidden="true" />
    <span className="text-xs font-medium tabular-nums text-gray-500 dark:text-zinc-400">
      {count}
    </span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Bucket section label                                                */
/* ------------------------------------------------------------------ */
const BucketHeader: FC<{ bucket: ReviewBucket; count: number; isCommunityAdmin: boolean }> = ({
  bucket,
  count,
  isCommunityAdmin,
}) => (
  <div className="flex items-center gap-2 border-y border-gray-100 bg-gray-50 px-4 py-1.5 dark:border-zinc-800 dark:bg-zinc-800/40">
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
  sort = "priority",
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

  // Only the admin queue carries follow-up dates, so only it can order by them.
  const byFollowUp = isCommunityAdmin && sort === "follow_up_date";

  const followUpSplit = useMemo(
    () => (byFollowUp ? partitionByFollowUp(shown) : null),
    [byFollowUp, shown]
  );

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
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-zinc-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {getListHeading(isCommunityAdmin, byFollowUp)}
        </h2>
        <span className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
          {isTruncated
            ? `Showing ${shown.length} of ${totalCount}`
            : `${shown.length} ${pluralize("item", shown.length)}`}
        </span>
      </div>

      {showKindToggle && (
        <div className="border-b border-gray-100 px-4 py-2.5 dark:border-zinc-800">
          <KindToggle value={kindFilter} onChange={onKindFilterChange} counts={counts} />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="m-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
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
      ) : followUpSplit ? (
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {followUpSplit.scheduled.map((item) => (
            <InboxListItem
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={onSelect}
              hideKind={uniform.kind}
              hideSubtitle={uniform.subtitle}
            />
          ))}

          {followUpSplit.unscheduled.length > 0 && (
            <>
              <NoFollowUpDivider count={followUpSplit.unscheduled.length} />

              {followUpSplit.unscheduled.map((item) => (
                <InboxListItem
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onSelect={onSelect}
                  hideKind={uniform.kind}
                  hideSubtitle={uniform.subtitle}
                />
              ))}
            </>
          )}
        </div>
      ) : (
        <div>
          {groups.map((group) => (
            <div key={group.bucket}>
              {/*
                A section label that names the only section is pure chrome: the
                list heading and its count already say the same thing two lines
                above ("Needs attention … 25 of 124" over "Needs action 25").
              */}
              {groups.length > 1 && (
                <BucketHeader
                  bucket={group.bucket}
                  count={group.list.length}
                  isCommunityAdmin={isCommunityAdmin}
                />
              )}
              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
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
