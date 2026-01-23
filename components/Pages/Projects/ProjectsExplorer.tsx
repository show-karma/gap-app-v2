"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/solid";
import debounce from "lodash.debounce";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import { useProjectsExplorerInfinite } from "@/hooks/useProjectsExplorerInfinite";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import { ProjectsLoading } from "./Loading";
import { ProjectCard } from "./ProjectCard";

const sortOptions: Record<ExplorerSortByOptions, string> = {
  createdAt: "Recently Added",
  updatedAt: "Recently Updated",
  title: "Title",
  noOfGrants: "No. of Grants",
  noOfProjectMilestones: "No. of Roadmap items",
  noOfGrantMilestones: "No. of Milestones",
};

export const ProjectsExplorer = () => {
  // URL state for search
  const [searchQuery, setSearchQuery] = useQueryState("q", {
    defaultValue: "",
    serialize: (value) => value || "",
    parse: (value) => value || "",
  });

  // URL state for sorting
  const [selectedSort, setSelectedSort] = useQueryState("sortBy", {
    defaultValue: "updatedAt",
    serialize: (value) => value,
    parse: (value) => (value as ExplorerSortByOptions) || "updatedAt",
  });

  const [selectedSortOrder, setSelectedSortOrder] = useQueryState("sortOrder", {
    defaultValue: "desc",
    serialize: (value) => value,
    parse: (value) => (value as ExplorerSortOrder) || "desc",
  });

  // Internal search state for debouncing
  const [inputValue, setInputValue] = useState(searchQuery || "");

  // Debounce search to avoid too many API calls
  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchQuery(value || null);
      }, PROJECTS_EXPLORER_CONSTANTS.DEBOUNCE_DELAY_MS),
    [setSearchQuery]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);

  // Sync input value when URL changes (e.g., back/forward navigation)
  useEffect(() => {
    setInputValue(searchQuery || "");
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSetSearch(value);
  };

  // Infinite query
  const {
    projects,
    totalCount,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    hasNextPage,
    fetchNextPage,
  } = useProjectsExplorerInfinite({
    search: searchQuery,
    sortBy: selectedSort as ExplorerSortByOptions,
    sortOrder: selectedSortOrder as ExplorerSortOrder,
  });

  // Handle sort change
  const changeSort = async (newValue: ExplorerSortByOptions) => {
    if (newValue !== selectedSort) {
      setSelectedSort(newValue);
      setSelectedSortOrder("desc");

      // Clear query cache to force refetch with new sort
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] === "projects-explorer-infinite",
      });
    }
  };

  return (
    <section id="browse-projects" className="w-full max-w-7xl mx-auto px-4 py-8 mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-black dark:text-white">Projects on Karma</h2>
          {!isLoading && totalCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalCount.toLocaleString()} {totalCount === 1 ? "project" : "projects"} found
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              aria-label="Search projects"
              placeholder="Search projects..."
              value={inputValue}
              onChange={handleSearchChange}
              className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-x-2">
            <label
              htmlFor="sort-by-select"
              className="text-sm font-medium text-gray-700 dark:text-zinc-300 whitespace-nowrap"
            >
              Sort by
            </label>
            <div className="flex items-center gap-1">
              <Select
                value={selectedSort}
                onValueChange={(value) => {
                  changeSort(value as ExplorerSortByOptions);
                }}
              >
                <SelectTrigger
                  id="sort-by-select"
                  aria-label="Sort projects by"
                  className="w-48 bg-white dark:bg-zinc-800 dark:text-zinc-200 border-gray-300 dark:border-zinc-700"
                >
                  <SelectValue>{sortOptions[selectedSort as ExplorerSortByOptions]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-800">
                  {Object.keys(sortOptions).map((sortOption) => (
                    <SelectItem
                      key={sortOption}
                      value={sortOption}
                      className="text-gray-900 dark:text-gray-200 focus:bg-gray-100 dark:focus:bg-zinc-700"
                    >
                      {sortOptions[sortOption as ExplorerSortByOptions]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setSelectedSortOrder(selectedSortOrder === "asc" ? "desc" : "asc")}
                aria-label={`Sort ${selectedSortOrder === "asc" ? "descending" : "ascending"}`}
                className="p-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {selectedSortOrder === "asc" ? (
                  <ArrowUpIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <ProjectsLoading />
      ) : isError ? (
        <div className="text-center py-12 text-gray-500">
          Failed to load projects. Please try again.
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? `No projects found for "${searchQuery}"` : "No projects available"}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {projects.map((project, index) => (
              <ProjectCard key={project.uid} project={project} index={index} />
            ))}
          </div>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center py-8">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isFetchingNextPage ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More Projects"
                )}
              </button>
            </div>
          )}

          {/* End of results */}
          {!hasNextPage && projects.length > 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Showing all {totalCount.toLocaleString()} projects
            </div>
          )}
        </>
      )}

      {/* Fetching indicator (for refetches) */}
      {isFetching && !isLoading && !isFetchingNextPage && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Updating...
        </div>
      )}
    </section>
  );
};
