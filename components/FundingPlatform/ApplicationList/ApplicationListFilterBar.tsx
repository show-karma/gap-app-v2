"use client";

import { ArrowDownTrayIcon, FunnelIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { Button } from "@/components/Utilities/Button";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import type { ProgramReviewer } from "@/services/program-reviewers.service";
import { ReviewerFilterDropdown } from "./ReviewerFilterDropdown";

interface ApplicationListFilterBarProps {
  searchInput: string;
  filters: IApplicationFilters;
  onSearchChange: (value: string) => void;
  onFilterChange: (filters: IApplicationFilters) => void;
  myReviewsOnly: boolean;
  onMyReviewsOnlyChange: (value: boolean) => void;
  programReviewers: ProgramReviewer[];
  selectedReviewerAddresses: string[];
  onReviewerAddressesChange: (addresses: string[]) => void;
  isLoadingProgramReviewers: boolean;
  isProgramReviewersError: boolean;
  onClearFilters: () => void;
  onExport: (format: "json" | "csv") => void;
  isExporting: boolean;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";
const toggleClass = (active: boolean) =>
  `px-3 py-1 text-sm font-medium rounded-md transition-colors ${
    active
      ? "bg-blue-600 text-white"
      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
  }`;
const actionButtonClass =
  "w-fit px-3 py-1 border bg-transparent text-zinc-500 font-medium border-zinc-200 dark:border-zinc-400 dark:text-zinc-400 flex flex-row gap-2";

export const ApplicationListFilterBar: FC<ApplicationListFilterBarProps> = ({
  searchInput,
  filters,
  onSearchChange,
  onFilterChange,
  myReviewsOnly,
  onMyReviewsOnlyChange,
  programReviewers,
  selectedReviewerAddresses,
  onReviewerAddressesChange,
  isLoadingProgramReviewers,
  isProgramReviewersError,
  onClearFilters,
  onExport,
  isExporting,
}) => (
  <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label htmlFor="app-list-search" className={labelClass}>
          Search
        </label>
        <input
          id="app-list-search"
          type="text"
          placeholder="Search by email, reference, or project title..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputClass} placeholder:text-gray-300 dark:placeholder-zinc-300`}
        />
      </div>

      <div>
        <label htmlFor="app-list-status" className={labelClass}>
          Status
        </label>
        <select
          id="app-list-status"
          value={filters.status || ""}
          onChange={(e) => onFilterChange({ status: e.target.value })}
          className={inputClass}
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
        <label htmlFor="app-list-date-from" className={labelClass}>
          From Date
        </label>
        <input
          id="app-list-date-from"
          type="date"
          value={filters.dateFrom || ""}
          onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="app-list-date-to" className={labelClass}>
          To Date
        </label>
        <input
          id="app-list-date-to"
          type="date"
          value={filters.dateTo || ""}
          onChange={(e) => onFilterChange({ dateTo: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>

    <div className="flex justify-between mt-4 space-x-2">
      <div className="flex flex-row items-center gap-2">
        <div className="flex flex-row gap-1 items-center rounded-lg border border-gray-200 dark:border-zinc-700 p-1">
          <button
            type="button"
            onClick={() => onMyReviewsOnlyChange(true)}
            aria-pressed={myReviewsOnly}
            className={toggleClass(myReviewsOnly)}
          >
            My Applications
          </button>
          <button
            type="button"
            onClick={() => onMyReviewsOnlyChange(false)}
            aria-pressed={!myReviewsOnly}
            className={toggleClass(!myReviewsOnly)}
          >
            All Applications
          </button>
        </div>
        {!myReviewsOnly && (
          <div className="w-64">
            <ReviewerFilterDropdown
              reviewers={programReviewers}
              selectedAddresses={selectedReviewerAddresses}
              onChange={onReviewerAddressesChange}
              isLoading={isLoadingProgramReviewers}
              isError={isProgramReviewersError}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-2">
        <Button onClick={onClearFilters} variant="secondary" className={actionButtonClass}>
          <FunnelIcon className="w-5 h-5" />
          Clear Filters
        </Button>

        <Button
          onClick={() => onExport("csv")}
          variant="secondary"
          disabled={isExporting}
          className={actionButtonClass}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>
    </div>
  </div>
);
