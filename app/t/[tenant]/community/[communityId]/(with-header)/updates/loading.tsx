import { Skeleton } from "@/components/Utilities/Skeleton";

const FILTER_KEYS = ["f0", "f1", "f2"];
const CARD_KEYS = Array.from({ length: 6 }, (_, i) => `card-${i}`);

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in-up">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-[420px] max-w-full" />
      </div>

      {/* Filter row skeleton */}
      <div className="flex flex-row flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-[260px] flex-1 max-w-[420px]" />
        {FILTER_KEYS.map((key) => (
          <Skeleton key={key} className="h-10 w-[140px]" />
        ))}
        <Skeleton className="h-10 w-[120px]" />
      </div>

      {/* Milestone card list skeleton */}
      <div className="flex flex-col gap-4">
        {CARD_KEYS.map((key) => (
          <div key={key} className="rounded-2xl border border-border bg-background p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <div className="mt-4 flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
