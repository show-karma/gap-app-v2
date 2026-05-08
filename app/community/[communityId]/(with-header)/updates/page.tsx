"use client";

import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
import { CommunityMilestoneCard } from "@/components/Pages/Community/Updates/CommunityMilestoneCard";
import { SimplePagination } from "@/components/Pages/Community/Updates/SimplePagination";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommunityMilestoneAllocations } from "@/hooks/useCommunityMilestoneAllocations";
import { useCommunityProjects } from "@/hooks/useCommunityProjects";
import { useCommunityProjectUpdates } from "@/hooks/useCommunityProjectUpdates";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { findProjectOptionBySlugOrUid, projectsToOptions } from "@/utilities/project-lookup";
import { sortCommunityMilestones } from "@/utilities/sorting/communityMilestoneSort";

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
      serialize: (value) => value ?? "",
      parse: (value) => value || null,
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
  const projectOptions = projectsToOptions(projectsData);
  // Support both UID and slug for selected project lookup (handles legacy UID URLs)
  const selectedProject = findProjectOptionBySlugOrUid(projectsData, selectedProjectId);

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

  // Reset pagination when program or project filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProgramId, selectedProjectId]);

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

  // Fetch payout configs for grants on the current page to show allocation amounts
  const { allocationMap } = useCommunityMilestoneAllocations(sortedRawData);

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
      <div className="flex flex-col gap-6 max-w-full w-full [&>*]:animate-fade-in-up [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:80ms] [&>*:nth-child(3)]:[animation-delay:160ms]">
        {/* Filter row */}
        <div className="flex flex-row flex-wrap items-end gap-5 w-full max-lg:flex-col max-lg:items-stretch">
          {/* Status */}
          <div className="flex flex-col gap-1.5 w-[180px] max-lg:w-full">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Status
            </span>
            <Select
              value={selectedFilter}
              onValueChange={(value) => handleFilterChange(value as FilterOption)}
            >
              <SelectTrigger
                className="min-w-40 w-full justify-between flex flex-row cursor-default rounded-md border-0 bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 h-auto"
                aria-label="Filter by status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Program filter */}
          <div className="flex flex-col gap-1.5 w-[260px] max-lg:w-full">
            <label
              htmlFor="filter-by-programs"
              className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            >
              Program
            </label>
            <SearchWithValueDropdown
              id="filter-by-programs"
              list={programs}
              onSelectFunction={(value: string) => changeSelectedProgramIdQuery(value)}
              type="Programs"
              selected={selectedProgram ? [selectedProgram.title] : []}
              prefixUnselected="All"
              buttonClassname="w-full"
              isMultiple={false}
              cleanFunction={() => changeSelectedProgramIdQuery(null)}
              isLoading={programsLoading}
            />
          </div>

          {/* Project filter */}
          <div className="flex flex-col gap-1.5 w-[260px] max-lg:w-full">
            <label
              htmlFor="filter-by-projects"
              className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            >
              Project
            </label>
            <SearchWithValueDropdown
              id="filter-by-projects"
              list={projectOptions}
              onSelectFunction={(value: string) => changeSelectedProjectIdQuery(value)}
              type="Projects"
              selected={selectedProject ? [selectedProject.title] : []}
              prefixUnselected="All"
              buttonClassname="w-full"
              isMultiple={false}
              cleanFunction={() => changeSelectedProjectIdQuery(null)}
              isLoading={projectsLoading}
            />
          </div>

          {/* Right side - Milestone count */}
          <div className="ml-auto flex items-center gap-2 pb-1.5 max-lg:ml-0">
            {isLoading ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
                Loading…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-[12.5px] font-medium text-muted-foreground">
                <span className="text-foreground tabular-nums font-semibold">
                  {data?.pagination?.totalCount || 0}
                </span>
                {pluralize("milestone", data?.pagination?.totalCount || 0)} to update
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Spinner />
          </div>
        ) : sortedRawData && sortedRawData.length > 0 ? (
          <>
            <div className="flex flex-col gap-4">
              {sortedRawData.map((milestone) => (
                <CommunityMilestoneCard
                  key={milestone.uid}
                  milestone={milestone}
                  allocationAmount={
                    allocationMap.get(milestone.uid) ??
                    allocationMap.get(milestone.uid.toLowerCase())
                  }
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
