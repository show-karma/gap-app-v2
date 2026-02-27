import { Skeleton } from "@/components/Utilities/Skeleton";
import { layoutTheme } from "@/src/helper/theme";

export function DashboardLoading() {
  return (
    <div className={layoutTheme.padding}>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-56" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={`dashboard-loading-card-${index}`}
              className="flex flex-col gap-4 rounded-xl border border-border p-6"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-9 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
