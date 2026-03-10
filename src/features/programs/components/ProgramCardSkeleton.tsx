"use client";

export function ProgramCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-xl border border-border p-6">
      {/* Status Badge Skeleton */}
      <div className="h-7 w-44 animate-pulse rounded-full bg-muted" />

      {/* Title Skeleton */}
      <div className="h-7 w-3/4 animate-pulse rounded-lg bg-muted" />

      {/* Description Skeleton */}
      <div className="flex flex-grow flex-col gap-2">
        <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Metadata Skeleton */}
      <div className="flex flex-col border-t border-border pt-4">
        <div className="flex items-center justify-between py-3">
          <div className="h-4 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="border-t border-border" />
        <div className="flex items-center justify-between py-3">
          <div className="h-4 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Buttons Skeleton */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
