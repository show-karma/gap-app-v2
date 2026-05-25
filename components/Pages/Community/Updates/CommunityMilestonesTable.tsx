import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { SortableHeader } from "@/components/Utilities/SortableHeader";
import type {
  CommunityUpdatesSortBy,
  CommunityUpdatesSortOrder,
} from "@/services/community-project-updates.service";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import { CommunityMilestonesTableRow } from "./CommunityMilestonesTableRow";

const TOTAL_COLUMNS = 8;
const skeletonRows = Array.from({ length: 8 }, (_, i) => i);

function PlainHeader({ children }: { children: ReactNode }) {
  return (
    <th
      scope="col"
      className="h-11 px-4 text-left align-middle font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
    >
      {children}
    </th>
  );
}

interface CommunityMilestonesTableProps {
  milestones: CommunityMilestoneUpdate[];
  isLoading: boolean;
  error?: Error | null;
  sortBy: CommunityUpdatesSortBy | null;
  sortOrder: CommunityUpdatesSortOrder;
  onSort: (field: CommunityUpdatesSortBy) => void;
  allocationMap: Map<string, string>;
  emptyState: ReactNode;
}

export function CommunityMilestonesTable({
  milestones,
  isLoading,
  error,
  sortBy,
  sortOrder,
  onSort,
  allocationMap,
  emptyState,
}: CommunityMilestonesTableProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
          <thead className="bg-gray-50 dark:bg-zinc-800/50">
            <tr>
              <SortableHeader
                label="Milestone"
                field="title"
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
              <SortableHeader
                label="Grant/Program"
                field="grantTitle"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="Status"
                field="status"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="Due date"
                field="dueDate"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <PlainHeader>Allocation</PlainHeader>
              <PlainHeader>Progress</PlainHeader>
              <SortableHeader
                label="Completion date"
                field="completionDate"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {isLoading ? (
              skeletonRows.map((i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="mt-1.5 h-3 w-32 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-12 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20 rounded" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={TOTAL_COLUMNS} className="px-4 py-12 text-center">
                  <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-red-400 dark:text-red-500 mb-3" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Error loading community updates
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {error.message || "An unexpected error occurred. Please try again later."}
                  </p>
                </td>
              </tr>
            ) : milestones.length === 0 ? (
              <tr>
                <td colSpan={TOTAL_COLUMNS} className="px-4 py-12 text-center">
                  {emptyState}
                </td>
              </tr>
            ) : (
              milestones.map((milestone) => (
                <CommunityMilestonesTableRow
                  key={milestone.uid}
                  milestone={milestone}
                  allocationAmount={
                    allocationMap.get(milestone.uid) ??
                    allocationMap.get(milestone.uid.toLowerCase())
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
