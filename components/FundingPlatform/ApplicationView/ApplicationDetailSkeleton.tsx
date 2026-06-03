"use client";

import { Skeleton } from "@/components/Utilities/Skeleton";

/**
 * Loading placeholder for {@link ApplicationDetailView}. Mirrors the real
 * layout — header card (title, ref, status pill, meta row, action buttons),
 * a tab bar, and a content card with field blocks — so the panel doesn't
 * collapse to a bare spinner while the application loads.
 */
export default function ApplicationDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>

        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-32" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-zinc-700">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Tabs + content card */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex gap-6 border-b border-gray-200 px-6 pt-4 dark:border-zinc-700">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="mb-3 h-4 w-24" />
        </div>

        <div className="space-y-6 p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              key={index}
              className="space-y-2"
            >
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
