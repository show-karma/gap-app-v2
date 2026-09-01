import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

const SKELETON_COLUMN_KEYS = Array.from({ length: 8 }, (_, i) => `skeleton-col-${i + 1}`);
const SKELETON_ROW_KEYS = Array.from({ length: 6 }, (_, i) => `skeleton-row-${i + 1}`);

function skeletonCellWidth(columnIndex: number): string {
  if (columnIndex === 0) return "w-4";
  if (columnIndex === 1) return "w-32";
  return "w-20";
}

export function ControlCenterSkeleton() {
  return (
    <div className="my-4 flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-1 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 mt-1" />
      </div>

      <div className="flex flex-wrap items-center gap-3 px-4">
        <Skeleton className="h-9 w-[150px] rounded-md" />
        <Skeleton className="h-9 w-[150px] rounded-md" />
        <Skeleton className="h-9 w-[150px] rounded-md" />
        <Skeleton className="h-9 w-[150px] rounded-md" />
        <Skeleton className="h-9 w-[200px] rounded-md" />
      </div>

      <div className="px-4">
        <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900">
                {SKELETON_COLUMN_KEYS.map((columnKey) => (
                  <th key={columnKey} className="h-11 px-4">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
              {SKELETON_ROW_KEYS.map((rowKey) => (
                <tr key={rowKey}>
                  {SKELETON_COLUMN_KEYS.map((columnKey, columnIndex) => (
                    <td key={`${rowKey}-${columnKey}`} className="px-4 py-3">
                      <Skeleton className={cn("h-4", skeletonCellWidth(columnIndex))} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
