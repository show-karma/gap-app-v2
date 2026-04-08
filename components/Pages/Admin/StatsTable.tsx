import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon, ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Skeleton } from "@/components/Utilities/Skeleton";
import TablePagination from "@/components/Utilities/TablePagination";
import type { MilestoneCompletion, Report } from "@/hooks/useReportPageData";
import { Link } from "@/src/components/navigation/Link";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

const skeletonArray = Array.from({ length: 12 }, (_, i) => i);

interface SortableHeaderProps {
  label: string;
  field: string;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
}

function SortableHeader({ label, field, sortBy, sortOrder, onSort }: SortableHeaderProps) {
  const isActive = sortBy === field;
  return (
    <th scope="col" className="h-11 px-4 text-left align-middle font-medium">
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors",
          isActive
            ? "text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        )}
        onClick={() => onSort(field)}
      >
        {label}
        {isActive ? (
          sortOrder === "asc" ? (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-orange-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-8">{pct}%</span>
    </div>
  );
}

interface StatsTableProps {
  reports: Report[] | undefined;
  isLoading: boolean;
  error?: Error | null;
  communityId: string;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  isFullyCompleted: (report: MilestoneCompletion) => boolean;
  grantTotalMap?: Map<string, string>;
}

export function StatsTable({
  reports,
  isLoading,
  error,
  communityId,
  sortBy,
  sortOrder,
  onSort,
  page,
  onPageChange,
  totalItems,
  itemsPerPage,
  isFullyCompleted,
  grantTotalMap,
}: StatsTableProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
          <thead className="bg-gray-50 dark:bg-zinc-800/50">
            <tr>
              <SortableHeader
                label="Grant Title"
                field="grantTitle"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="Project"
                field="projectTitle"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th
                scope="col"
                className="h-11 px-4 text-left align-middle font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Amount
              </th>
              <SortableHeader
                label="Total"
                field="totalMilestones"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="Pending"
                field="pendingMilestones"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="Completed"
                field="completedMilestones"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th
                scope="col"
                className="h-11 px-4 text-left align-middle font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {isLoading ? (
              skeletonArray.map((i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-36 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-10 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-10 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-8 rounded" />
                      <Skeleton className="h-1.5 w-16 rounded-full" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-red-400 dark:text-red-500 mb-3" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Failed to load milestone stats
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {error.message || "An unexpected error occurred. Please try again later."}
                  </p>
                </td>
              </tr>
            ) : reports?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    No milestone data found
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Try adjusting your filters or check back later.
                  </p>
                </td>
              </tr>
            ) : (
              reports?.map((report) => {
                const completed = isFullyCompleted(report);
                return (
                  <tr
                    key={`${report.grantUid}-${report.programId ?? ""}`}
                    className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 max-w-[240px]">
                      <div className="flex items-center gap-2">
                        <ExternalLink
                          href={PAGES.PROJECT.GRANT(report.projectSlug, report.grantUid)}
                          className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 transition-colors"
                        >
                          {report.grantTitle}
                        </ExternalLink>
                        {completed && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 whitespace-nowrap flex-shrink-0">
                            Done
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <ExternalLink
                        href={PAGES.PROJECT.OVERVIEW(report.projectSlug)}
                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 transition-colors"
                      >
                        {report.projectTitle}
                      </ExternalLink>
                    </td>
                    <td className="px-4 py-3">
                      {grantTotalMap?.get(report.grantUid) ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                          {grantTotalMap.get(report.grantUid)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${PAGES.PROJECT.GRANT(
                          report.projectSlug,
                          report.grantUid
                        )}/milestones-and-updates#all`}
                        className="text-sm text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 tabular-nums transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {report.totalMilestones}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${PAGES.PROJECT.GRANT(
                          report.projectSlug,
                          report.grantUid
                        )}/milestones-and-updates#pending`}
                        className={cn(
                          "text-sm tabular-nums transition-colors",
                          report.pendingMilestones > 0
                            ? "text-orange-600 dark:text-orange-400 font-medium"
                            : "text-gray-500 dark:text-gray-400"
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {report.pendingMilestones}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`${PAGES.PROJECT.GRANT(
                            report.projectSlug,
                            report.grantUid
                          )}/milestones-and-updates#completed`}
                          className="text-sm text-gray-900 dark:text-white tabular-nums hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {report.completedMilestones}
                        </Link>
                        <ProgressBar
                          completed={report.completedMilestones}
                          total={report.totalMilestones}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {report.programId && (
                        <Link
                          href={PAGES.REVIEWER.FUNDING_PLATFORM.MILESTONES(
                            communityId,
                            normalizeProgramId(report.programId),
                            report.projectUid
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button className="py-1.5 px-3 text-xs">Review</Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        currentPage={page}
        setCurrentPage={onPageChange}
        postsPerPage={itemsPerPage}
        totalPosts={totalItems}
      />
    </div>
  );
}
