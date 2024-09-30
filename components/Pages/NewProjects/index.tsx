"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { ProjectFromList } from "@/types/project";
import { Fragment, useState } from "react";
import { ProjectCard } from "./ProjectCard";
import { errorManager } from "@/components/Utilities/errorManager";
import { PageInfo } from "@/types/pagination";
import { ProjectCardListSkeleton } from "./Loading";
import { Spinner } from "@/components/Utilities/Spinner";
import { Listbox, Transition } from "@headlessui/react";
import { useQueryState } from "nuqs";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";
import { CheckIcon } from "@heroicons/react/20/solid";
import { queryClient } from "@/components/Utilities/WagmiProvider";

type SortByOptions =
  | "createdAt"
  | "updatedAt"
  | "title"
  | "noOfGrants"
  | "noOfProjectMilestones";

type SortOrder = "asc" | "desc";

const getNewProjects = async (
  pageSize: number,
  page: number = 0,
  sortBy: SortByOptions = "createdAt",
  sortOrder: SortOrder = "desc"
): Promise<{
  projects: ProjectFromList[];
  pageInfo: PageInfo;
  nextOffset: number;
}> => {
  try {
    const [data, error, pageInfo] = await fetchData(
      INDEXER.PROJECTS.GET_ALL(page * pageSize, pageSize, sortBy, sortOrder)
    );
    if (error) {
      throw new Error("Something went wrong while fetching new projects");
    }
    return {
      projects: data?.data as ProjectFromList[],
      pageInfo: pageInfo,
      nextOffset: page + 1,
    };
  } catch (e) {
    errorManager("Something went wrong while fetching new projects", e);
    return {
      projects: [],
      pageInfo: { totalItems: 0, page: 0, pageLimit: pageSize },
      nextOffset: 0,
    };
  }
};

const sortOptions: Record<SortByOptions, string> = {
  createdAt: "Recently Added",
  updatedAt: "Recently Updated",
  title: "Title",
  noOfGrants: "No. of Grants",
  noOfProjectMilestones: "No. of Project Milestones",
};

export const NewProjectsPage = () => {
  // const { data: projects, isLoading } = useQuery({
  const [selectedSort, changeSortQuery] = useQueryState("sortBy", {
    defaultValue: "createdAt",
    serialize: (value) => value,
    parse: (value) =>
      value ? (value as SortByOptions) : ("createdAt" as SortByOptions),
  });
  const [selectedSortOrder, changeSortOrderQuery] = useQueryState("sortOrder", {
    defaultValue: "desc",
    serialize: (value) => value,
    parse: (value) => (value ? (value as SortOrder) : ("desc" as SortOrder)),
  });

  const {
    data,
    isFetching,
    fetchNextPage: loadMore,
    hasNextPage: haveMore,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["new-projects"],
    queryFn: (ctx) =>
      getNewProjects(
        12,
        ctx.pageParam,
        selectedSort as SortByOptions,
        selectedSortOrder as SortOrder
      ),
    getNextPageParam: (lastGroup) => lastGroup.nextOffset,
    initialPageParam: 0,
  });

  const projects = data?.pages.flatMap((page) => page.projects);

  const commonWidth = 359;

  const changeSort = async (newValue: SortByOptions) => {
    changeSortQuery(newValue);
    changeSortOrderQuery(selectedSortOrder === "asc" ? "desc" : "asc");

    queryClient.removeQueries({
      queryKey: ["new-projects"],
      exact: true,
    });
  };

  return (
    <div className="flex w-full max-w-full flex-row justify-start gap-6 px-12 pb-7 pt-5 max-2xl:px-8 max-md:px-4 max-lg:flex-col">
      <div className="flex w-full max-w-full flex-col justify-start items-center gap-6">
        <div className="flex flex-row justify-between items-center gap-3 w-full">
          <h1 className="text-2xl font-bold text-black dark:text-white">
            Projects on GAP
          </h1>
          <div>
            {/* Sort start */}
            <Listbox
              value={selectedSort}
              onChange={(value) => {
                changeSort(value as SortByOptions);
              }}
            >
              {({ open }) => (
                <div className="flex items-center gap-x-2  max-sm:w-full max-sm:justify-between">
                  <Listbox.Label className="text-base font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-sm">
                    Sort by
                  </Listbox.Label>
                  <div className="relative flex-1 w-48">
                    <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left  dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 text-gray-900   ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
                      <span className="block truncate">
                        {sortOptions[selectedSort as SortByOptions]}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        {selectedSortOrder === "asc" ? (
                          <ArrowUpIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ArrowDownIcon className="h-5 w-5 text-gray-400" />
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
                      <Listbox.Options className="absolute  z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base  dark:bg-zinc-800 dark:text-zinc-200 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {Object.keys(sortOptions).map((sortOption) => (
                          <Listbox.Option
                            key={sortOption}
                            className={({ active }) =>
                              cn(
                                active
                                  ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                  : "text-gray-900 dark:text-gray-200 ",
                                "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                              )
                            }
                            value={sortOption}
                          >
                            {({ selected, active }) => (
                              <>
                                <span
                                  className={cn(
                                    selected ? "font-semibold" : "font-normal",
                                    "block truncate"
                                  )}
                                >
                                  {sortOptions[sortOption as SortByOptions]}
                                </span>

                                {selected ? (
                                  <span
                                    className={cn(
                                      "text-blue-600 dark:text-blue-400",
                                      "absolute inset-y-0 right-0 flex items-center pr-4"
                                    )}
                                  >
                                    <CheckIcon
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  </span>
                                ) : null}
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
            {/* Sort end */}
          </div>
        </div>

        {/* <div className="flex gap-8 flex-row max-lg:flex-col-reverse w-full h-full"> */}
        <div className="h-full w-full my-8">
          {projects && projects.length > 0 ? (
            <InfiniteScroll
              dataLength={projects.length}
              next={loadMore}
              hasMore={haveMore}
              // loader={<ProjectCardListSkeleton />}
              loader={null}
              style={{
                width: "100%",
                height: "100%",
              }}
            >
              <AutoSizer disableHeight>
                {({ width }) => {
                  const columns = Math.floor(width / commonWidth);
                  const columnCounter = columns
                    ? columns > 4
                      ? 4
                      : columns
                    : 1;
                  const columnWidth = Math.floor(width / columnCounter);
                  const gutterSize = 20;
                  const height =
                    Math.ceil(projects.length / columnCounter) * 260;

                  return (
                    <Grid
                      height={height + 60}
                      width={width}
                      rowCount={Math.ceil(projects.length / columnCounter)}
                      rowHeight={260}
                      columnWidth={columnWidth}
                      columnCount={columnCounter}
                      cellRenderer={({ columnIndex, key, rowIndex, style }) => {
                        const project =
                          projects[rowIndex * columnCounter + columnIndex];
                        return (
                          <div
                            key={key}
                            style={{
                              ...style,
                              left:
                                +(style.left || 0) +
                                (columnIndex * gutterSize) /
                                  (columnCounter - 1),
                              width: +(style.width || 0) - gutterSize,
                              top:
                                rowIndex === 0
                                  ? +(style.top || 0)
                                  : +(style.top || 0) + gutterSize,

                              height: +(style.height || 0) - gutterSize,
                            }}
                          >
                            {project && (
                              <div
                                style={{
                                  height: "100%",
                                  width: "100%",
                                }}
                              >
                                <ProjectCard
                                  key={project.title + project.createdAt}
                                  index={rowIndex * 4 + columnIndex}
                                  project={project}
                                />
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  );
                }}
              </AutoSizer>
            </InfiniteScroll>
          ) : null}
          {isLoading || isFetching ? (
            <div className="w-full flex items-center justify-center">
              <Spinner />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
