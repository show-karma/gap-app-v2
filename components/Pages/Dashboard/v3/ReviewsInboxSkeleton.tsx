"use client";

import { cn } from "@/utilities/tailwind";
import { SK } from "./soft-classes";

const ROWS = ["a", "b", "c", "d"];

/** One master-list row placeholder, mirroring InboxListItem's shape. */
function RowSkeleton() {
  return (
    <div className="rounded-xl border border-sf-line bg-sf-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn(SK, "h-4 w-14 !rounded-full")} />
        <span className={cn(SK, "h-5 w-20 !rounded-full")} />
      </div>
      <span className={cn(SK, "mb-2 block h-4 w-4/5")} />
      <span className={cn(SK, "block h-3 w-2/5")} />
      <div className="mt-3 flex items-center justify-between">
        <span className={cn(SK, "h-3 w-16")} />
        <span className={cn(SK, "h-6 w-10 !rounded-md")} />
      </div>
    </div>
  );
}

/**
 * Loading placeholder for the "My reviews" drill-in. Matches the reviewer
 * inbox's real shape — header + stat pills, then the two-pane
 * master-list / detail layout — instead of a generic flat list, so the
 * transition into the loaded inbox doesn't jump.
 */
export function ReviewsInboxSkeleton() {
  return (
    <div className="w-full space-y-6" aria-hidden>
      {/* Header: icon chip + title/role, then the four stat pills. */}
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <span className={cn(SK, "h-11 w-11 !rounded-xl")} />
          <div className="space-y-2 pt-1">
            <span className={cn(SK, "block h-6 w-40")} />
            <span className={cn(SK, "block h-3.5 w-56")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {ROWS.map((k) => (
            <span key={k} className={cn(SK, "h-[68px] w-full !rounded-2xl")} />
          ))}
        </div>
      </div>

      {/* Two-pane: master list on the left, detail pane on the right. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {ROWS.map((k) => (
            <RowSkeleton key={k} />
          ))}
        </div>
        <div className="min-h-[420px] rounded-2xl border border-sf-line bg-sf-card p-6">
          <div className="flex items-center gap-3">
            <span className={cn(SK, "h-12 w-12 !rounded-xl")} />
            <div className="flex-1 space-y-2">
              <span className={cn(SK, "block h-5 w-1/2")} />
              <span className={cn(SK, "block h-3 w-1/3")} />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <span className={cn(SK, "block h-3 w-full")} />
            <span className={cn(SK, "block h-3 w-11/12")} />
            <span className={cn(SK, "block h-3 w-4/5")} />
            <span className={cn(SK, "block h-3 w-full")} />
            <span className={cn(SK, "block h-3 w-2/3")} />
          </div>
        </div>
      </div>
    </div>
  );
}
