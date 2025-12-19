import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FundingMapCardSkeleton() {
  return (
    <Card className="flex flex-col gap-4 border-border p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-lg" />
        </div>

        <Skeleton className="h-6 w-3/4" />

        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );
}
