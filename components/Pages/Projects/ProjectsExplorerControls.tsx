"use client";

import { ArrowDownIcon, ArrowUpIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import debounce from "lodash.debounce";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import {
  type ProjectsExplorerState,
  parseProjectsExplorerRequest,
} from "@/utilities/projects-explorer-request";
import { sortOptions } from "./ProjectsExplorer";

/**
 * The explorer's controls, and the only place `/projects` reads the URL.
 *
 * The build named the reads directly:
 *
 *   Route "/t/[tenant]/projects": `useSearchParams()` in a Client Component outside of `<Suspense>`
 *     at ProjectsExplorer (components/Pages/Projects/ProjectsExplorer.tsx:50:54)  useQueryState("q", ...)
 *
 * nuqs reads `useSearchParams()`, which goes through `useDynamicSearchParams`
 * and aborts a prerender unconditionally — no sample makes it static. `/projects`
 * is crawlable, so DEV-612 forbids a boundary over the project grid, but a search
 * box and a sort dropdown are controls, not content: they can sit behind a leaf.
 *
 * The grid renders outside it from the server-provided default, and this
 * component publishes the live URL state back up after hydration.
 */
export function ProjectsExplorerControls({
  onStateChange,
}: {
  onStateChange: (state: ProjectsExplorerState) => void;
}) {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useQueryState("q", {
    defaultValue: "",
    serialize: (value) => value || "",
    parse: (value) => value || "",
  });

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

  const [hasPayoutAddress, setHasPayoutAddress] = useQueryState("raisingFunds", {
    defaultValue: "",
    serialize: (value) => value || "",
    parse: (value) => value || "",
  });

  const isPayoutAddressFilterActive = hasPayoutAddress === "true";

  const normalizedState = parseProjectsExplorerRequest({
    q: searchQuery,
    sortBy: selectedSort,
    sortOrder: selectedSortOrder,
    raisingFunds: hasPayoutAddress,
  });

  useEffect(() => {
    onStateChange(normalizedState);
    // The normalized object is rebuilt each render; its fields are the identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    normalizedState.q,
    normalizedState.sortBy,
    normalizedState.sortOrder,
    normalizedState.raisingFunds,
  ]);

  const [inputValue, setInputValue] = useState(searchQuery || "");

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchQuery(value || null);
      }, PROJECTS_EXPLORER_CONSTANTS.DEBOUNCE_DELAY_MS),
    [setSearchQuery]
  );

  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    if (!value) {
      debouncedSetSearch.cancel();
      setSearchQuery(null);
      return;
    }
    debouncedSetSearch(value);
  };

  const changeSort = async (newValue: ExplorerSortByOptions) => {
    if (newValue !== selectedSort) {
      setSelectedSort(newValue);
      setSelectedSortOrder("desc");
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] === "projects-explorer-infinite",
      });
    }
  };

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            aria-label="Search projects"
            placeholder="Search projects…"
            value={inputValue}
            onChange={handleSearchChange}
            className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Raising Funds Filter */}
        {/* `htmlFor`/`id` rather than nesting: the control is now the shadcn
            Input component, and a label cannot be seen to wrap a component. */}
        <label
          htmlFor="projects-raising-funds"
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <Input
            id="projects-raising-funds"
            type="checkbox"
            aria-label="Filter to projects raising funds"
            checked={isPayoutAddressFilterActive}
            onChange={() => setHasPayoutAddress(isPayoutAddressFilterActive ? null : "true")}
            className="sr-only peer"
          />
          <span
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
              isPayoutAddressFilterActive ? "bg-blue-600" : "bg-gray-300 dark:bg-zinc-600"
            } peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                isPayoutAddressFilterActive ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 whitespace-nowrap">
            Raising Funds
          </span>
        </label>

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
              value={normalizedState.sortBy}
              onValueChange={(value) => {
                changeSort(value as ExplorerSortByOptions);
              }}
            >
              <SelectTrigger
                id="sort-by-select"
                aria-label="Sort projects by"
                className="w-48 bg-white dark:bg-zinc-800 dark:text-zinc-200 border-gray-300 dark:border-zinc-700"
              >
                <SelectValue>{sortOptions[normalizedState.sortBy]}</SelectValue>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setSelectedSortOrder(normalizedState.sortOrder === "asc" ? "desc" : "asc")
              }
              aria-label={`Sort ${normalizedState.sortOrder === "asc" ? "descending" : "ascending"}`}
              className="p-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              {normalizedState.sortOrder === "asc" ? (
                <ArrowUpIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
