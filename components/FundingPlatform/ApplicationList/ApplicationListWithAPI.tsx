'use client';

import { FC, useState, useCallback } from 'react';
import ApplicationList from './ApplicationList';
import { useFundingApplications } from '@/hooks/useFundingPlatform';
import { IApplicationFilters } from '@/services/fundingPlatformService';
import { IFundingApplication } from '@/types/funding-platform';

interface IApplicationListWithAPIProps {
  programId: string;
  chainId: number;
  onApplicationSelect?: (application: IFundingApplication) => void;
  showStatusActions?: boolean;
  initialFilters?: IApplicationFilters;
}

const ApplicationListWithAPI: FC<IApplicationListWithAPIProps> = ({
  programId,
  chainId,
  onApplicationSelect,
  showStatusActions = false,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<IApplicationFilters>(initialFilters);
  
  const {
    applications,
    total,
    page,
    totalPages,
    stats,
    isLoading,
    error,
    updateApplicationStatus,
    exportApplications,
    isUpdatingStatus,
    refetch,
  } = useFundingApplications(programId, chainId, filters);

  const handleStatusChange = useCallback(async (applicationId: string, status: string, note?: string) => {
    try {
      await updateApplicationStatus({ applicationId, status, note });
      // Refetch to get updated data
      refetch();
    } catch (error) {
      console.error('Failed to update application status:', error);
    }
  }, [updateApplicationStatus, refetch]);

  const handleExport = useCallback((format: 'json' | 'csv' = 'json') => {
    exportApplications(format);
  }, [exportApplications]);

  const handleFilterChange = useCallback((newFilters: IApplicationFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

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

  return (
    <div className="w-full space-y-6">
      {/* Statistics Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Applications
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {stats.submitted}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Submitted
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.under_review}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Under Review
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Approved
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-red-600">
              {stats.rejected}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Rejected
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search applications..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange({ status: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
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
              value={filters.dateFrom || ''}
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
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-4 space-x-2">
          <button
            onClick={() => setFilters({})}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear Filters
          </button>
          
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Export CSV
          </button>
          
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Application List */}
      <ApplicationList
        programId={programId}
        chainId={chainId}
        applications={applications}
        isLoading={isLoading}
        onApplicationSelect={onApplicationSelect}
        onStatusChange={showStatusActions ? handleStatusChange : undefined}
        onExport={() => handleExport('json')}
        showStatusActions={showStatusActions}
      />

      {/* Pagination Info */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            Page {page} of {totalPages} ({total} total applications)
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleFilterChange({ page: Math.max(1, page - 1) })}
              disabled={page === 1}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
            >
              Previous
            </button>
            
            <button
              onClick={() => handleFilterChange({ page: Math.min(totalPages, page + 1) })}
              disabled={page === totalPages}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
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