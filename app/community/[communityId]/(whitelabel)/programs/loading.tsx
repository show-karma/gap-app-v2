import { ProgramCardSkeleton } from "@/features/programs/components/ProgramCardSkeleton";

const SKELETON_KEYS = ["load-1", "load-2", "load-3", "load-4", "load-5", "load-6"];

export default function ProgramsLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="mb-8">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-5 w-80 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Filters skeleton */}
      <div className="mb-6 h-24 animate-pulse rounded-xl border border-border bg-muted" />

      {/* Program cards skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SKELETON_KEYS.map((key) => (
          <ProgramCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}
