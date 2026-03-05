import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Skeleton } from "@/components/Utilities/Skeleton";
import TablePagination from "@/components/Utilities/TablePagination";
import type { PendingVerificationMilestone } from "@/hooks/usePendingVerificationMilestones";
import { Link } from "@/src/components/navigation/Link";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { PAGES } from "@/utilities/pages";

const skeletonArray = Array.from({ length: 12 }, (_, i) => i);

interface PendingVerificationTableProps {
  milestones: PendingVerificationMilestone[];
  isLoading: boolean;
  error: Error | null;
  communityId: string;
  page: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  selectedReviewerAddress?: string;
  currentUserAddress?: string;
}

export function getEmptyStateMessage(
  selectedReviewerAddress?: string,
  currentUserAddress?: string
): string {
  if (
    selectedReviewerAddress &&
    currentUserAddress &&
    selectedReviewerAddress.toLowerCase() === currentUserAddress.toLowerCase()
  ) {
    return "All your assigned milestones are verified";
  }
  if (selectedReviewerAddress) {
    return "All milestones assigned to this reviewer are verified";
  }
  return "All milestones are verified";
}

export function PendingVerificationTable({
  milestones,
  isLoading,
  error,
  communityId,
  page,
  onPageChange,
  totalItems,
  itemsPerPage,
  selectedReviewerAddress,
  currentUserAddress,
}: PendingVerificationTableProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
          <thead className="bg-gray-50 dark:bg-zinc-800/50">
            <tr>
              <th
                scope="col"
                className="h-11 px-4 text-left align-middle font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Project
              </th>
              <th
                scope="col"
                className="h-11 px-4 text-left align-middle font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Grant
              </th>
              <th
                scope="col"
                className="h-11 px-4 text-left align-middle font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Milestone Title
              </th>
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
                    <Skeleton className="h-4 w-40 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-red-400 dark:text-red-500 mb-3" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Failed to load pending milestones
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {error.message || "An unexpected error occurred. Please try again later."}
                  </p>
                </td>
              </tr>
            ) : milestones.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <CheckCircleIcon className="mx-auto h-10 w-10 text-green-400 dark:text-green-500 mb-3" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {getEmptyStateMessage(selectedReviewerAddress, currentUserAddress)}
                  </p>
                </td>
              </tr>
            ) : (
              milestones.map((milestone) => (
                <tr
                  key={`${milestone.grantUid}-${milestone.milestoneUid}`}
                  className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-4 py-3 max-w-[200px]">
                    <ExternalLink
                      href={PAGES.PROJECT.OVERVIEW(milestone.projectSlug)}
                      className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 transition-colors"
                    >
                      {milestone.projectTitle}
                    </ExternalLink>
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <ExternalLink
                      href={PAGES.PROJECT.GRANT(milestone.projectSlug, milestone.grantUid)}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 transition-colors"
                    >
                      {milestone.grantTitle}
                    </ExternalLink>
                  </td>
                  <td className="px-4 py-3 max-w-[300px]">
                    <span className="text-sm text-gray-900 dark:text-white line-clamp-2">
                      {milestone.milestoneTitle}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {milestone.programId && (
                      <Link
                        href={PAGES.REVIEWER.FUNDING_PLATFORM.MILESTONES(
                          communityId,
                          normalizeProgramId(milestone.programId),
                          milestone.projectUid
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="py-1.5 px-3 text-xs">Review</Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalItems > 0 && (
        <TablePagination
          currentPage={page}
          setCurrentPage={onPageChange}
          postsPerPage={itemsPerPage}
          totalPosts={totalItems}
        />
      )}
    </div>
  );
}
