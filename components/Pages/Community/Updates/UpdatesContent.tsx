import type { FC, ReactNode } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import type {
  CommunityUpdatesSortBy,
  CommunityUpdatesSortOrder,
} from "@/services/community-project-updates.service";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";
import { CommunityMilestoneCard } from "./CommunityMilestoneCard";
import { CommunityMilestonesTable } from "./CommunityMilestonesTable";
import { SimplePagination } from "./SimplePagination";

interface UpdatesContentProps {
  isTableView: boolean;
  isLoading: boolean;
  error?: Error | null;
  milestones: CommunityMilestoneUpdate[];
  sortBy: CommunityUpdatesSortBy | null;
  sortOrder: CommunityUpdatesSortOrder;
  onSort: (field: CommunityUpdatesSortBy) => void;
  allocationMap: Map<string, string>;
  emptyState: ReactNode;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Renders the community updates body for either view (table or cards) along
 * with shared pagination, keeping the page component free of branching.
 * The table view owns its own loading/empty/error states; the cards view
 * handles loading/empty here.
 */
export const UpdatesContent: FC<UpdatesContentProps> = ({
  isTableView,
  isLoading,
  error,
  milestones,
  sortBy,
  sortOrder,
  onSort,
  allocationMap,
  emptyState,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pagination =
    totalPages > 1 ? (
      <div className="flex justify-center mt-8">
        <SimplePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    ) : null;

  if (isTableView) {
    return (
      <>
        <CommunityMilestonesTable
          milestones={milestones}
          isLoading={isLoading}
          error={error}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
          allocationMap={allocationMap}
          emptyState={emptyState}
        />
        {!isLoading && pagination}
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (milestones.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {milestones.map((milestone) => (
          <CommunityMilestoneCard
            key={milestone.uid}
            milestone={milestone}
            allocationAmount={
              allocationMap.get(milestone.uid) ?? allocationMap.get(milestone.uid.toLowerCase())
            }
          />
        ))}
      </div>
      {pagination}
    </>
  );
};
