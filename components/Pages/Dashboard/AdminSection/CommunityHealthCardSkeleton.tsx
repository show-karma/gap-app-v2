import { Skeleton } from "@/components/ui/skeleton";

export function CommunityHealthCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}
