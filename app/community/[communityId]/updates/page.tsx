"use client";

import { Listbox, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
import { CommunityMilestoneCard } from "@/components/Pages/Community/Updates/CommunityMilestoneCard";
import { SimplePagination } from "@/components/Pages/Community/Updates/SimplePagination";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityProjects } from "@/hooks/useCommunityProjects";
import { useCommunityProjectUpdates } from "@/hooks/useCommunityProjectUpdates";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { sortCommunityMilestones } from "@/utilities/sorting/communityMilestoneSort";
import { cn } from "@/utilities/tailwind";

type FilterOption = "all" | "pending" | "completed" | "past_due";

const ITEMS_PER_PAGE = 25;

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "past_due", label: "Past Due" },
];

export default function CommunityUpdatesPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get filter from URL searchParams, default to 'all' if not present or invalid
  const filterFromUrl = searchParams.get("filter");
  const isValidFilter = (filter: string | null): filter is FilterOption => {
    return (
      filter === "all" || filter === "pending" || filter === "completed" || filter === "past_due"
    );
  };
  const selectedFilter = isValidFilter(filterFromUrl) ? filterFromUrl : "all";
  const [currentPage, setCurrentPage] = useState(1);

  // Program filter state
  const [selectedProgramId, changeSelectedProgramIdQuery] = useQueryState<string | null>(
    "programId",
    {
      defaultValue: null,
      serialize: (value) => {
        if (!value) return "";
        const normalized = value.includes("_") ? value.split("_")[0] : value;
        return normalized;
      },
      parse: (value) => {
        if (!value) return null;
        const normalized = value.includes("_") ? value.split("_")[0] : value;
        return normalized;
      },
    }
  );

  // Project filter state
  const [selectedProjectId, changeSelectedProjectIdQuery] = useQueryState<string | null>(
    "projectId",
    {
      defaultValue: null,
      serialize: (value) => value ?? "",
      parse: (value) => value || null,
    }
  );

  // Fetch programs for the community
  const { data: programsData, isLoading: programsLoading } = useCommunityPrograms(
    communityId as string
  );
  const programs =
    programsData?.map((program) => ({
      title: program.metadata?.title || "",
      value: program.programId || "",
    })) || [];
  const selectedProgram = programs.find((program) => program.value === selectedProgramId);

  // Fetch projects filtered by selected program
  const { data: projectsData, isLoading: projectsLoading } =
    useCommunityProjects(selectedProgramId);
  const projectOptions =
    projectsData?.map((project) => ({
      title: project.title,
      value: project.slug || project.uid, // Prefer slug for URL-friendly values
    })) || [];
  // Support both UID and slug for selected project lookup
  const selectedProject = projectOptions.find((project) => project.value === selectedProjectId);

  // Track previous program to detect actual changes (not initial load)
  const previousProgramRef = useRef<string | null>(null);

  // Reset project selection when program actually changes (not on initial load)
  useEffect(() => {
    // On first render, store the current program and don't reset
    if (previousProgramRef.current === null) {
      previousProgramRef.current = selectedProgramId;
      return;
    }

    // Only reset if program actually changed from a previous value
    if (selectedProgramId !== previousProgramRef.current) {
      changeSelectedProjectIdQuery(null);
      previousProgramRef.current = selectedProgramId;
    }
  }, [selectedProgramId, changeSelectedProjectIdQuery]);

  // Fetch community updates from API using custom hook
  const { data, isLoading, error } = useCommunityProjectUpdates(communityId, {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    status: selectedFilter,
    programId: selectedProgramId,
    projectId: selectedProjectId,
  });

  // Memoize sorted data
  // Backend handles all filtering including status, programId, and projectId
  const sortedRawData = useMemo(() => {
    if (!data?.payload) return [];
    return sortCommunityMilestones([...data.payload], selectedFilter, communityId);
  }, [data?.payload, selectedFilter, communityId]);

  // Calculate total pages
  const totalPages = data ? Math.ceil((data.pagination.totalCount || 0) / ITEMS_PER_PAGE) : 0;

  // Memoize filter change handler to prevent unnecessary recreations
  const handleFilterChange = useCallback(
    (newFilter: FilterOption) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newFilter === "all") {
        params.delete("filter");
      } else {
        params.set("filter", newFilter);
      }

      // Reset page to 1 when filter changes
      setCurrentPage(1);

      // Update URL
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

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
        : selectedFilter === "past_due"
          ? "No past due milestones found."
          : `No ${selectedFilter} milestones found.`;

    return (
      <div className="flex w-full items-center justify-center rounded border border-gray-200 px-6 py-10">
        <div className="flex max-w-[438px] flex-col items-center justify-center gap-6">
          <Image
            src="/images/comments.png"
            alt="No updates"
            width={438}
            height={185}
            className="object-cover"
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
        {/* Filter row */}
        <div className="px-3 py-4 bg-gray-100 dark:bg-zinc-900 rounded-lg flex flex-row items-center w-full gap-8 max-lg:flex-col max-lg:gap-4 max-lg:justify-start max-lg:items-start">
          {/* Left side - Filters */}
          <div className="flex flex-row items-center gap-6 flex-wrap max-lg:w-full">
            {/* Status filter dropdown */}
            <Listbox value={selectedFilter} onChange={handleFilterChange}>
              <div className="relative">
                <Listbox.Button className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 min-w-[120px]">
                  {filterOptions.find((opt) => opt.value === selectedFilter)?.label}
                  <ChevronDownIcon className="w-4 h-4 ml-auto" />
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute left-0 z-10 mt-1 max-h-60 w-full min-w-[120px] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm dark:bg-zinc-800">
                    {filterOptions.map((option) => (
                      <Listbox.Option
                        key={option.value}
                        className={({ active }) =>
                          cn(
                            "relative cursor-pointer select-none py-2 px-4",
                            active ? "bg-brand-blue text-white" : "text-gray-900 dark:text-zinc-200"
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

            {/* Program filter */}
            <div className="flex flex-row gap-2 items-center flex-1 max-w-[350px]">
              <Image
                src="/icons/program.svg"
                alt="program"
                width={24}
                height={24}
                className="w-6 h-6 min-w-6 max-w-6 min-h-6 max-h-6"
              />
              <p className="text-gray-800 dark:text-zinc-100 text-sm font-semibold leading-normal whitespace-nowrap">
                Program
              </p>
              <SearchWithValueDropdown
                id="filter-by-programs"
                list={programs}
                onSelectFunction={(value: string) => changeSelectedProgramIdQuery(value)}
                type="Programs"
                selected={selectedProgram ? [selectedProgram.title] : []}
                prefixUnselected="All"
                buttonClassname="w-full max-w-full"
                isMultiple={false}
                cleanFunction={() => changeSelectedProgramIdQuery(null)}
                isLoading={programsLoading}
              />
            </div>

            {/* Project filter */}
            <div className="flex flex-row gap-2 items-center flex-1 max-w-[350px]">
              <Image
                src="/icons/project.png"
                alt="Project"
                width={24}
                height={24}
                className="w-6 h-6 min-w-6 max-w-6 min-h-6 max-h-6"
              />
              <p className="text-gray-800 dark:text-zinc-100 text-sm font-semibold leading-normal whitespace-nowrap">
                Project
              </p>
              <SearchWithValueDropdown
                id="filter-by-projects"
                list={projectOptions}
                onSelectFunction={(value: string) => changeSelectedProjectIdQuery(value)}
                type="Projects"
                selected={selectedProject ? [selectedProject.title] : []}
                prefixUnselected="All"
                buttonClassname="w-full max-w-full"
                isMultiple={false}
                cleanFunction={() => changeSelectedProjectIdQuery(null)}
                isLoading={projectsLoading}
              />
            </div>
          </div>

          {/* Right side - Milestone count */}
          <div className="flex items-center gap-2 ml-auto max-lg:ml-0">
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {isLoading
                ? "Loading..."
                : `${data?.pagination?.totalCount || 0} ${pluralize("milestone", data?.pagination?.totalCount || 0)} to update`}
            </span>
          </div>
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
                <CommunityMilestoneCard key={milestone.uid} milestone={milestone} />
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
