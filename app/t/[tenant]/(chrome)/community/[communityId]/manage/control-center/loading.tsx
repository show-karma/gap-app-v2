import { Skeleton } from "@/components/Utilities/Skeleton";

export default function Loading() {
  const skeletonCols = 9;
  return (
    <div className="my-4 flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 mt-1" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4">
        <Skeleton className="h-9 w-[150px] rounded-md" />
        <Skeleton className="h-9 w-[150px] rounded-md" />
        <Skeleton className="h-9 w-[150px] rounded-md" />
        <Skeleton className="h-9 w-[150px] rounded-md" />
        <Skeleton className="h-9 w-[200px] rounded-md" />
      </div>

      {/* Table */}
      <div className="px-4">
        <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900">
                {Array.from({ length: skeletonCols }).map((_, i) => (
                  <th key={i} className="h-11 px-4">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
              {Array.from({ length: 6 }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: skeletonCols }).map((_, colIdx) => (
                    <td key={colIdx} className="px-4 py-3">
                      <Skeleton
                        className={
                          colIdx === 0 ? "h-4 w-4" : colIdx === 1 ? "h-4 w-32" : "h-4 w-20"
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination skeleton */}
          <div className="border-t border-gray-200 dark:border-zinc-700 px-4 py-3 flex justify-between items-center">
            <Skeleton className="h-4 w-44 rounded" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
