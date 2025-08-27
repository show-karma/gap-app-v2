"use client";

import { FC, useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import ApplicationList from "./ApplicationList";
import {
  useFundingApplications,
  useApplicationExport,
} from "@/hooks/useFundingPlatform";
import { IApplicationFilters } from "@/services/fundingPlatformService";
import { IFundingApplication } from "@/types/funding-platform";
import { Button } from "@/components/Utilities/Button";
import { ArrowDownTrayIcon, FunnelIcon } from "@heroicons/react/24/outline";
import formatCurrency from "@/utilities/formatCurrency";

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

  // Initialize filters and sorting from URL params
  const [filters, setFilters] = useState<IApplicationFilters>(() => {
    const urlFilters = { ...initialFilters };
    if (searchParams.get('search')) urlFilters.search = searchParams.get('search')!;
    if (searchParams.get('status')) urlFilters.status = searchParams.get('status')!;
    if (searchParams.get('dateFrom')) urlFilters.dateFrom = searchParams.get('dateFrom')!;
    if (searchParams.get('dateTo')) urlFilters.dateTo = searchParams.get('dateTo')!;
    if (searchParams.get('page')) urlFilters.page = parseInt(searchParams.get('page')!);
    return urlFilters;
  });

  const [sortBy, setSortBy] = useState<IApplicationFilters['sortBy']>(() => {
    const urlSortBy = searchParams.get('sortBy');
    return (urlSortBy as IApplicationFilters['sortBy']) || 'status';
  });

  const [sortOrder, setSortOrder] = useState<IApplicationFilters['sortOrder']>(() => {
    const urlSortOrder = searchParams.get('sortOrder');
    return (urlSortOrder as IApplicationFilters['sortOrder']) || 'asc';
  });

  const {
    applications,
    total,
    page,
    totalPages,
    stats,
    isLoading,
    error,
    updateApplicationStatus,
    isUpdatingStatus,
    refetch,
  } = useFundingApplications(programId, chainId, { ...filters, sortBy, sortOrder });

  const { exportApplications, isExporting } = useApplicationExport(
    programId,
    chainId,
    isAdmin
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

    if (filters.page && filters.page > 1) {
      params.set("page", filters.page.toString());
    } else {
      params.delete("page");
    }

    // Add sorting params
    if (sortBy && sortBy !== 'createdAt') {
      params.set("sortBy", sortBy);
    } else {
      params.delete("sortBy");
    }

    if (sortOrder && sortOrder !== 'desc') {
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

  const handleSortChange = useCallback((newSortBy: string) => {
    const typedSortBy = newSortBy as IApplicationFilters['sortBy'];
    if (sortBy === typedSortBy) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with default desc order
      setSortBy(typedSortBy);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search applications..."
              value={filters.search || ""}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status || ""}
              onChange={(e) => handleFilterChange({ status: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="revision_requested">Revision Requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="flex justify-between mt-4 space-x-2">
          <div className="flex flex-row gap-4 items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {applications.length} application(s) found
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => {
                setFilters({});
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

      {/* Application List */}
      <ApplicationList
        programId={programId}
        chainID={chainId}
        applications={applications}
        isLoading={isLoading}
        onApplicationSelect={onApplicationSelect}
        onApplicationHover={onApplicationHover}
        onStatusChange={showStatusActions ? handleStatusChange : undefined}
        showStatusActions={showStatusActions}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />

      {/* Pagination Info */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            Page {page} of {totalPages} ({total} total applications)
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() =>
                handleFilterChange({ page: Math.max(1, page - 1) })
              }
              disabled={page === 1}
              className="px-3 py-1 bg-gray-200 dark:bg-zinc-700 rounded disabled:opacity-50"
            >
              Previous
            </button>

            <button
              onClick={() =>
                handleFilterChange({ page: Math.min(totalPages, page + 1) })
              }
              disabled={page === totalPages}
              className="px-3 py-1 bg-gray-200 dark:bg-zinc-700 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationListWithAPI;
