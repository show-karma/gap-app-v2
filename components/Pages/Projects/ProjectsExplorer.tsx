"use client";

import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/solid";
import debounce from "lodash.debounce";
import { useQueryState } from "nuqs";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import { useProjectsExplorerInfinite } from "@/hooks/useProjectsExplorerInfinite";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import { cn } from "@/utilities/tailwind";
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

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Handle sort change
  const changeSort = async (newValue: ExplorerSortByOptions) => {
    if (newValue === selectedSort) {
      // Toggle sort order if same field is selected
      setSelectedSortOrder(selectedSortOrder === "asc" ? "desc" : "asc");
    } else {
      setSelectedSort(newValue);
      setSelectedSortOrder("desc");
    }

    // Clear query cache to force refetch with new sort
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] === "projects-explorer-infinite",
    });
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
              placeholder="Search projects..."
              value={inputValue}
              onChange={handleSearchChange}
              className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Sort Dropdown */}
          <Listbox
            value={selectedSort}
            onChange={(value) => {
              changeSort(value as ExplorerSortByOptions);
            }}
          >
            {({ open }) => (
              <div className="flex items-center gap-x-2">
                <Listbox.Label className="text-sm font-medium text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                  Sort by
                </Listbox.Label>
                <div className="relative w-48">
                  <Listbox.Button
                    id="sort-by-button"
                    className="relative w-full cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 text-gray-900 ring-1 ring-inset ring-gray-300 text-sm"
                  >
                    <span className="block truncate">
                      {sortOptions[selectedSort as ExplorerSortByOptions]}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      {selectedSortOrder === "asc" ? (
                        <ArrowUpIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </span>
                  </Listbox.Button>

                  <Transition
                    show={open}
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm dark:bg-zinc-800 dark:text-zinc-200 ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {Object.keys(sortOptions).map((sortOption) => (
                        <Listbox.Option
                          key={sortOption}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                : "text-gray-900 dark:text-gray-200",
                              "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                            )
                          }
                          value={sortOption}
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={cn(
                                  selected ? "font-semibold" : "font-normal",
                                  "block truncate"
                                )}
                              >
                                {sortOptions[sortOption as ExplorerSortByOptions]}
                              </span>

                              {selected && (
                                <span className="text-blue-600 dark:text-blue-400 absolute inset-y-0 right-0 flex items-center pr-4">
                                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                              )}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </div>
            )}
          </Listbox>
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

          {/* Load More Trigger */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  <span>Loading more...</span>
                </div>
              ) : (
                <div className="h-8" />
              )}
            </div>
          )}

          {/* End of results */}
          {!hasNextPage && projects.length > 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Showing all {projects.length} projects
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
