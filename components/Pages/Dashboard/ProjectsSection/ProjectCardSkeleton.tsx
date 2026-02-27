import { Skeleton } from "@/components/Utilities/Skeleton";

export function ProjectCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}
