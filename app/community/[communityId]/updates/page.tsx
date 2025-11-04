"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ActivityList } from "@/components/Shared/ActivityList";
import { Button } from "@/components/Utilities/Button";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { envVars } from "@/utilities/enviromentVars";
import { SimplePagination } from "@/components/Pages/Community/Updates/SimplePagination";
import { Spinner } from "@/components/Utilities/Spinner";
import { Listbox, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { cn } from "@/utilities/tailwind";
import Link from "next/link";
import { CommunityMilestoneCard } from "@/components/Pages/Community/Updates/CommunityMilestoneCard";
import { INDEXER } from "@/utilities/indexer";
import pluralize from "pluralize";

type FilterOption = "all" | "pending" | "completed";

interface CommunityMilestoneUpdate {
  uid: string;
  communityUID: string;
  status: "pending" | "completed";
  details: {
    title: string;
    description: string;
    dueDate: string | null;
  };
  project: {
    uid: string;
    details: {
      data: {
        title: string;
        slug: string;
      };
    };
  };
  grant?: {
    uid: string;
    details: {
      data: {
        title: string;
      };
    };
  };
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 25;

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

export default function CommunityUpdatesPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get filter from URL searchParams, default to 'all' if not present or invalid
  const filterFromUrl = searchParams.get('filter');
  const isValidFilter = (filter: string | null): filter is FilterOption => {
    return filter === 'all' || filter === 'pending' || filter === 'completed';
  };
  const selectedFilter = isValidFilter(filterFromUrl) ? filterFromUrl : 'all';
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch community updates from API
  const { data, isLoading, error } = useQuery({
    queryKey: ["communityUpdates", communityId, selectedFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (selectedFilter !== "all") {
        params.append("status", selectedFilter);
      }

      const response = await fetch(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL
        }${INDEXER.COMMUNITY.MILESTONES(communityId)}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch community updates: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Data now includes project and grant details, no additional fetching needed
      return data;
    },
    enabled: !!communityId,
  });
  // No transformation needed since we're using the raw data directly

  // Memoize sorted data to prevent unnecessary recalculations
  const sortedRawData = useMemo(() => {
    if (!data?.payload) return [];

    return [...data.payload].sort(
      (a: CommunityMilestoneUpdate, b: CommunityMilestoneUpdate) => {
        if (selectedFilter === "all") {
          // For "all" filter: pending first (by ascending due date), then completed (by descending completion date)
          const aCompleted = a.status === "completed";
          const bCompleted = b.status === "completed";

          if (aCompleted !== bCompleted) {
            return aCompleted ? 1 : -1; // Pending first
          }

          if (!aCompleted && !bCompleted) {
            // Both pending: sort by ascending due date
            const aDueDate = a.details.dueDate
              ? new Date(a.details.dueDate).getTime()
              : Number.MAX_SAFE_INTEGER;
            const bDueDate = b.details.dueDate
              ? new Date(b.details.dueDate).getTime()
              : Number.MAX_SAFE_INTEGER;
            return aDueDate - bDueDate;
          }

          // Both completed: sort by descending completion date
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        } else if (selectedFilter === "pending") {
          // Sort by earliest upcoming due date (ascending)
          const aDueDate = a.details.dueDate
            ? new Date(a.details.dueDate).getTime()
            : Number.MAX_SAFE_INTEGER;
          const bDueDate = b.details.dueDate
            ? new Date(b.details.dueDate).getTime()
            : Number.MAX_SAFE_INTEGER;
          return aDueDate - bDueDate;
        } else {
          // Completed: sort by most recent completion date (descending)
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }
      }
    );
  }, [data?.payload, selectedFilter]);

  // Calculate total pages
  const totalPages = data ? Math.ceil((data.pagination.totalCount || 0) / ITEMS_PER_PAGE) : 0;

  // Memoize filter change handler to prevent unnecessary recreations
  const handleFilterChange = useCallback((newFilter: FilterOption) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }

    // Reset page to 1 when filter changes
    setCurrentPage(1);

    // Update URL
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  // Memoize page change handler
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Memoize empty state rendering
  const renderEmptyState = useMemo(() => {
    const message =
      selectedFilter === "all"
        ? "No milestones have been created by any projects in this community yet."
        : `No ${selectedFilter} milestones found.`;

    return (
      <div className="flex w-full items-center justify-center rounded border border-gray-200 px-6 py-10">
        <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
          <img
            src="/images/comments.png"
            alt=""
            className="h-[185px] w-[438px] object-cover"
          />
          <div className="flex w-full flex-col items-center justify-center gap-3">
            <p className="text-center text-lg font-semibold text-black dark:text-zinc-100">
              Community Updates
            </p>
            <p className="text-center text-base font-normal text-black dark:text-zinc-100">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }, [selectedFilter]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-500">Error loading community updates</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start">
      <div className="flex flex-col gap-6 my-10 max-lg:my-5 max-w-full w-full">
        {/* Header with filter */}
        <div className="flex flex-row gap-4 justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isLoading
                ? "Loading..."
                : `${data?.pagination?.totalCount || 0} ${pluralize('milestone update', data?.pagination?.totalCount || 0)}`}
            </span>
          </div>

          {/* Filter dropdown */}
          <Listbox value={selectedFilter} onChange={handleFilterChange}>
            <div className="relative">
              <Listbox.Button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600">
                {
                  filterOptions.find((opt) => opt.value === selectedFilter)
                    ?.label
                }
                <ChevronDownIcon className="w-4 h-4" />
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute right-0 z-10 mt-1 max-h-60 w-full min-w-[120px] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm dark:bg-zinc-800">
                  {filterOptions.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      className={({ active }) =>
                        cn(
                          "relative cursor-pointer select-none py-2 px-4",
                          active
                            ? "bg-brand-blue text-white"
                            : "text-gray-900 dark:text-zinc-200"
                        )
                      }
                      value={option.value}
                    >
                      {({ selected }) => (
                        <span
                          className={cn(
                            "block truncate",
                            selected ? "font-medium" : "font-normal"
                          )}
                        >
                          {option.label}
                        </span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Spinner />
          </div>
        ) : sortedRawData && sortedRawData.length > 0 ? (
          <>
            <div className="flex flex-col gap-4 px-2">
              {sortedRawData.map((milestone) => (
                <CommunityMilestoneCard
                  key={milestone.uid}
                  milestone={milestone}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <SimplePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        ) : (
          renderEmptyState
        )}
      </div>
    </div>
  );
}
