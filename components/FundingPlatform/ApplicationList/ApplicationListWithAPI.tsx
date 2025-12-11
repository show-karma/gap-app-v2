"use client";

import { ArrowDownTrayIcon, FunnelIcon } from "@heroicons/react/24/outline";
// eslint-disable-next-line import/no-extraneous-dependencies
import debounce from "lodash.debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Button } from "@/components/Utilities/Button";
import {
  useApplicationExport,
  useFundingApplications,
  useProgramConfig,
} from "@/hooks/useFundingPlatform";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import { useProgram } from "@/hooks/usePrograms";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import type { IFundingApplication } from "@/types/funding-platform";
import formatCurrency from "@/utilities/formatCurrency";
import { getAIColumnVisibility } from "../helper/getAIColumnVisibility";
import ApplicationList from "./ApplicationList";

interface IApplicationListWithAPIProps {
  programId: string;
  chainId: number;
  onApplicationSelect?: (application: IFundingApplication) => void;
  onApplicationHover?: (applicationId: string) => void;
  showStatusActions?: boolean;
  initialFilters?: IApplicationFilters;
  onStatusChange?: (applicationId: string, status: string, note?: string) => Promise<any>;
  isAdmin?: boolean;
}

const ApplicationListWithAPI: FC<IApplicationListWithAPIProps> = ({
  programId,
  chainId,
  onApplicationSelect,
  onApplicationHover,
  showStatusActions = false,
  initialFilters = {},
  onStatusChange: parentOnStatusChange,
  isAdmin = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize filters from URL params (excluding page for infinite scroll)
  const [filters, setFilters] = useState<IApplicationFilters>(() => {
    const urlFilters = { ...initialFilters };
    if (searchParams.get("search")) urlFilters.search = searchParams.get("search")!;
    if (searchParams.get("status")) urlFilters.status = searchParams.get("status")!;
    if (searchParams.get("dateFrom")) urlFilters.dateFrom = searchParams.get("dateFrom")!;
    if (searchParams.get("dateTo")) urlFilters.dateTo = searchParams.get("dateTo")!;
    // Remove page handling for infinite scroll
    return urlFilters;
  });

  // Local state for search input (immediate UI updates)
  const [searchInput, setSearchInput] = useState(filters.search || "");

  const [sortBy, setSortBy] = useState<IApplicationFilters["sortBy"]>(() => {
    const urlSortBy = searchParams.get("sortBy");
    return (urlSortBy as IApplicationFilters["sortBy"]) || "status";
  });

  const [sortOrder, setSortOrder] = useState<IApplicationFilters["sortOrder"]>(() => {
    const urlSortOrder = searchParams.get("sortOrder");
    return (urlSortOrder as IApplicationFilters["sortOrder"]) || "asc";
  });

  // Debounced search function (waits 500ms after user stops typing)
  const debouncedSearch = useMemo(
    () =>
      debounce((searchValue: string) => {
        setFilters((prev) => ({ ...prev, search: searchValue || undefined }));
      }, 500),
    []
  );

  const {
    applications,
    total,
    page,
    totalPages,
    stats,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    updateApplicationStatus,
    isUpdatingStatus,
    refetch,
  } = useFundingApplications(programId, chainId, { ...filters, sortBy, sortOrder });

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { exportApplications, isExporting } = useApplicationExport(programId, chainId, isAdmin);

  // Fetch program config and program data to determine AI column visibility
  const { config } = useProgramConfig(programId, chainId);
  const { data: program } = useProgram(programId);

  // Fetch reviewers for the program (errors are handled gracefully - columns won't show if fetch fails)
  const { data: programReviewers = [] } = useProgramReviewers(programId, chainId);
  const { data: milestoneReviewers = [] } = useMilestoneReviewers(programId, chainId);

  // Determine column visibility based on configured prompts
  const { showAIScoreColumn, showInternalAIScoreColumn } = useMemo(
    () => getAIColumnVisibility(config?.formSchema, program?.langfusePromptId),
    [config?.formSchema, program?.langfusePromptId]
  );

  // Sync filters and sorting with URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Update filter params
    if (filters.search) {
      params.set("search", filters.search);
    } else {
      params.delete("search");
    }

    if (filters.status) {
      params.set("status", filters.status);
    } else {
      params.delete("status");
    }

    if (filters.dateFrom) {
      params.set("dateFrom", filters.dateFrom);
    } else {
      params.delete("dateFrom");
    }

    if (filters.dateTo) {
      params.set("dateTo", filters.dateTo);
    } else {
      params.delete("dateTo");
    }

    // Remove page handling for infinite scroll

    // Add sorting params
    if (sortBy && sortBy !== "createdAt") {
      params.set("sortBy", sortBy);
    } else {
      params.delete("sortBy");
    }

    // Always persist sortOrder in URL if it's set
    if (sortOrder) {
      params.set("sortOrder", sortOrder);
    } else {
      params.delete("sortOrder");
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(newUrl, { scroll: false });
  }, [filters, sortBy, sortOrder, pathname, router, searchParams]);

  const handleStatusChange = useCallback(
    async (applicationId: string, status: string, note?: string) => {
      try {
        await updateApplicationStatus({ applicationId, status, note });
        // Refetch to get updated data
        refetch();
        // Call parent's onStatusChange if provided
      } catch (error) {
        console.error("Failed to update application status:", error);
      }
    },
    [updateApplicationStatus, refetch]
  );

  const handleExport = useCallback(
    (format: "json" | "csv" = "json") => {
      exportApplications(format, { ...filters, sortBy, sortOrder });
    },
    [exportApplications, filters, sortBy, sortOrder]
  );

  const handleFilterChange = useCallback((newFilters: IApplicationFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value); // Update UI immediately
      debouncedSearch(value); // Update filters after 500ms
    },
    [debouncedSearch]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSortChange = useCallback(
    (newSortBy: string) => {
      const typedSortBy = newSortBy as IApplicationFilters["sortBy"];
      if (sortBy === typedSortBy) {
        // Toggle sort order if clicking the same column
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        // Set new sort column with default desc order
        setSortBy(typedSortBy);
        setSortOrder("desc");
      }
    },
    [sortBy, sortOrder]
  );

  // Memoize reviewer assignment change callback to prevent unnecessary re-renders
  const handleReviewerAssignmentChange = useCallback(() => {
    // Refetch applications when reviewers are assigned
    refetch();
  }, [refetch]);

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-4xl">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Error Loading Applications
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            There was an error loading the applications. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statsMap = [
    {
      title: "Total Applications",
      value: stats?.totalApplications || 0,
    },
    {
      title: "Pending Review",
      value: stats?.pendingApplications || 0,
    },
    {
      title: "Revision Requested",
      value: stats?.revisionRequestedApplications || 0,
    },
    {
      title: "Under Review",
      value: stats?.underReviewApplications || 0,
    },
    {
      title: "Approved",
      value: stats?.approvedApplications || 0,
    },
    {
      title: "Rejected",
      value: stats?.rejectedApplications || 0,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Statistics Bar */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {statsMap.map((item) => (
            <div
              key={item.title}
              className="bg-white dark:bg-zinc-800 p-4 rounded-lg border items-center justify-center"
            >
              <div className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                {formatCurrency(item.value || 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {item.title}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Filters */}
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="app-list-search"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Search
            </label>
            <input
              id="app-list-search"
              type="text"
              placeholder="Search by email, reference, or project title..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
            />
          </div>

          <div>
            <label
              htmlFor="app-list-status"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Status
            </label>
            <select
              id="app-list-status"
              value={filters.status || ""}
              onChange={(e) => handleFilterChange({ status: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="resubmitted">Resubmitted</option>
              <option value="under_review">Under Review</option>
              <option value="revision_requested">Revision Requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="app-list-date-from"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              From Date
            </label>
            <input
              id="app-list-date-from"
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="app-list-date-to"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              To Date
            </label>
            <input
              id="app-list-date-to"
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="flex justify-between mt-4 space-x-2">
          <div className="flex flex-row gap-4 items-center" />
          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => {
                setFilters({});
                setSearchInput("");
                debouncedSearch.cancel(); // Cancel any pending debounced search
                router.push(pathname, { scroll: false });
              }}
              variant="secondary"
              className="w-fit px-3 py-1 border bg-transparent text-zinc-500 font-medium border-zinc-200 dark:border-zinc-400 dark:text-zinc-400 flex flex-row gap-2"
            >
              <FunnelIcon className="w-5 h-5" />
              Clear Filters
            </Button>

            <Button
              onClick={() => handleExport("csv")}
              variant="secondary"
              disabled={isExporting}
              className="w-fit px-3 py-1 border bg-transparent text-zinc-500 font-medium border-zinc-200 dark:border-zinc-400 dark:text-zinc-400 flex flex-row gap-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </div>
      </div>

      {/* Application List with Infinite Scroll */}
      <InfiniteScroll
        dataLength={applications.length}
        next={loadMore}
        hasMore={hasNextPage || false}
        loader={
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Loading more applications...
            </div>
          </div>
        }
        endMessage={
          applications.length > 0 ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {total} total {pluralize("application", total)} loaded
              </div>
            </div>
          ) : null
        }
      >
        <ApplicationList
          programId={programId}
          chainID={chainId}
          applications={applications}
          isLoading={isLoading && applications.length === 0}
          onApplicationSelect={onApplicationSelect}
          onApplicationHover={onApplicationHover}
          onStatusChange={showStatusActions ? handleStatusChange : undefined}
          showStatusActions={showStatusActions}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          showAIScoreColumn={showAIScoreColumn}
          showInternalAIScoreColumn={showInternalAIScoreColumn}
          programReviewers={programReviewers}
          milestoneReviewers={milestoneReviewers}
          onReviewerAssignmentChange={handleReviewerAssignmentChange}
        />
      </InfiniteScroll>
    </div>
  );
};

export default ApplicationListWithAPI;
