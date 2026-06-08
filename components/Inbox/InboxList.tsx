"use client";

import pluralize from "pluralize";
import React, { type FC, useMemo } from "react";
import { InboxListItem } from "@/components/Inbox/InboxListItem";
import { BUCKET_META, BUCKET_RANK } from "@/components/Inbox/statusToBucket";
import type { InboxItem, ReviewBucket } from "@/components/Inbox/types";
import { cn } from "@/utilities/tailwind";

/** Stream filter for the segmented Applications|Milestones toggle. */
export type InboxKindFilter = "all" | "application" | "milestone";

interface InboxListProps {
  items: InboxItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** When true, render the Applications|Milestones segmented toggle. */
  hasBothRoles: boolean;
  kindFilter: InboxKindFilter;
  onKindFilterChange: (filter: InboxKindFilter) => void;
}

const BUCKET_DOT: Record<ReviewBucket, string> = {
  action: "bg-teal-500",
  waiting: "bg-amber-500",
  done: "bg-green-500",
};

const ORDERED_BUCKETS: ReviewBucket[] = (Object.keys(BUCKET_META) as ReviewBucket[]).sort(
  (a, b) => BUCKET_RANK[a] - BUCKET_RANK[b]
);

/* ------------------------------------------------------------------ */
/* Bucket section label                                                */
/* ------------------------------------------------------------------ */
const BucketHeader: FC<{ bucket: ReviewBucket; count: number }> = ({ bucket, count }) => (
  <div className="flex items-center gap-2 pb-2 pt-1">
    <span className={cn("h-2 w-2 rounded-full", BUCKET_DOT[bucket])} />
    <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">
      {BUCKET_META[bucket].label}
    </h3>
    <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">{count}</span>
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
  const options: { key: InboxKindFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "application", label: `Applications (${counts.application})` },
    { key: "milestone", label: `Milestones (${counts.milestone})` },
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
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-white text-brand-blue shadow-sm dark:bg-zinc-900"
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

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */
const InboxListComponent: FC<InboxListProps> = ({
  items,
  selectedId,
  onSelect,
  hasBothRoles,
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

  const groups = useMemo(
    () =>
      ORDERED_BUCKETS.map((bucket) => ({
        bucket,
        list: shown.filter((i) => i.bucket === bucket),
      })).filter((group) => group.list.length > 0),
    [shown]
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {hasBothRoles ? "Filter" : "Assigned to you"}
        </h2>
        <span className="text-xs text-gray-400 dark:text-zinc-500">
          {shown.length} {pluralize("item", shown.length)}
        </span>
      </div>

      {hasBothRoles && (
        <div className="mb-3">
          <KindToggle value={kindFilter} onChange={onKindFilterChange} counts={counts} />
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.bucket}>
            <BucketHeader bucket={group.bucket} count={group.list.length} />
            <div className="space-y-2.5">
              {group.list.map((item) => (
                <InboxListItem
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const InboxList = React.memo(InboxListComponent);
InboxList.displayName = "InboxList";
