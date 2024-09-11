"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo } from "react";
import { Fragment, useState } from "react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { Listbox, Transition } from "@headlessui/react";
import { useParams, useSearchParams } from "next/navigation";
import { Hex } from "viem";
import { getGrants } from "@/utilities/sdk/communities/getGrants";
import type { Grant } from "@show-karma/karma-gap-sdk";
import { Spinner } from "./Utilities/Spinner";
import { GrantCard } from "./GrantCard";
import { useQueryState } from "nuqs";
import { SortByOptions, StatusOptions } from "@/types";
import pluralize from "pluralize";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import { cn } from "@/utilities/tailwind";
import { zeroUID } from "@/utilities/commons";
import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

import { errorManager } from "./Utilities/errorManager";
import { getTotalProjects } from "@/utilities/karma/totalProjects";

const sortOptions: Record<SortByOptions, string> = {
  recent: "Recent",
  completed: "Completed",
  milestones: "Milestones",
};

const statuses: Record<StatusOptions, string> = {
  all: "All",
  "to-complete": "To Complete",
  completed: "Completed",
  starting: "Starting",
};

interface CommunityGrantsProps {
  categoriesOptions: string[];
  defaultSelectedCategories: string[];
  defaultSortBy: SortByOptions;
  defaultSelectedStatus: StatusOptions;
}

export const CommunityGrants = ({
  categoriesOptions,
  defaultSelectedCategories,
  defaultSortBy,
  defaultSelectedStatus,
}: CommunityGrantsProps) => {
  const params = useParams();
  const communityId = params.communityId as string;

  const [currentPage, setCurrentPage] = useState(0);

  const [selectedCategories, changeCategoriesQuery] = useQueryState(
    "categories",
    {
      defaultValue: defaultSelectedCategories,
      serialize: (value) => value?.join(","),
      parse: (value) => (value ? value.split(",") : null),
    }
  );

  const [selectedSort, changeSortQuery] = useQueryState("sortBy", {
    defaultValue: defaultSortBy,
    serialize: (value) => value,
    parse: (value) =>
      value ? (value as SortByOptions) : ("milestones" as SortByOptions),
  });

  const [selectedStatus, changeStatusQuery] = useQueryState("status", {
    defaultValue: defaultSelectedStatus,
    serialize: (value) => value,
    parse: (value) =>
      value ? (value as StatusOptions) : ("all" as StatusOptions),
  });

  // Call API
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [grants, setGrants] = useState<Grant[]>([]); // Data returned from the API
  const itemsPerPage = 12; // Set the total number of items you want returned from the API
  const [totalGrants, setTotalGrants] = useState(0); // Total number of grants
  const [haveMore, setHaveMore] = useState(true); // Boolean to check if there are more grants to load

  const selectedCategoriesIds = useMemo(
    () => selectedCategories.join("_"),
    [selectedCategories]
  );

  useEffect(() => {
    if (!communityId || communityId === zeroUID) return;

    const fetchNewGrants = async () => {
      setLoading(true);
      try {
        const { grants: fetchedGrants, pageInfo } = await getGrants(
          communityId as Hex,
          {
            sortBy: selectedSort,
            status: selectedStatus,
            categories: selectedCategoriesIds.split("_"),
          },
          {
            page: currentPage,
            pageLimit: itemsPerPage,
          }
        );
        if (fetchedGrants && fetchedGrants.length) {
          setHaveMore(fetchedGrants.length === itemsPerPage);
          setGrants((prev) =>
            currentPage === 0 ? fetchedGrants : [...prev, ...fetchedGrants]
          );
          setTotalGrants((prev) => pageInfo?.totalItems || prev);
        } else {
          if (currentPage === 0) {
            setHaveMore(false);
            setGrants([]);
            setTotalGrants(0);
          }
        }
      } catch (error: any) {
        console.log("error", error);
        errorManager("Error while fetching community grants", error);
        setGrants([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNewGrants();
  }, [
    communityId,
    selectedSort,
    selectedStatus,
    selectedCategoriesIds,
    currentPage,
  ]);

  const changeSort = async (newValue: SortByOptions) => {
    setCurrentPage(0);
    changeSortQuery(newValue);
  };
  const changeStatus = async (newValue: StatusOptions) => {
    setCurrentPage(0);
    changeStatusQuery(newValue);
  };
  const changeCategories = async (newValue: string[]) => {
    setCurrentPage(0);
    changeCategoriesQuery(newValue);
  };

  const loadMore = async () => {
    if (!loading) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
    }
  };

  const { data: totalProjects, isLoading } = useQuery({
    queryKey: ["totalProjects", communityId],
    queryFn: () => getTotalProjects(communityId),
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between flex-row flex-wrap-reverse max-lg:flex-wrap max-lg:flex-col-reverse max-lg:justify-start max-lg:items-start gap-3 max-lg:gap-4">
        <div className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-xl">
          Total Grants {totalGrants ? `(${totalGrants})` : null}{" "}
          {!isLoading ? `across ${totalProjects || 0} projects` : null}
        </div>
        <div className="flex items-center gap-x-3 flex-wrap gap-y-2">
          {/* Filter by category start */}
          {categoriesOptions.length ? (
            <Listbox
              value={selectedCategories}
              // onChange={setSelectedCategories}
              onChange={(values) => {
                changeCategories(values);
              }}
              multiple
            >
              {({ open }) => (
                <div className="flex items-center gap-x-2 max-sm:w-full max-sm:justify-between">
                  <Listbox.Label className="text-base font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-sm">
                    Filter by category
                  </Listbox.Label>
                  <div className="relative flex-1 w-max">
                    <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left  dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 text-gray-900   ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
                      {selectedCategories.length > 0 ? (
                        <p className="flex flex-row gap-1">
                          {selectedCategories.length}
                          <span>
                            {pluralize("category", selectedCategories.length)}{" "}
                            selected
                          </span>
                        </p>
                      ) : (
                        <p>Categories</p>
                      )}
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </span>
                    </Listbox.Button>

                    <Transition
                      show={open}
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-max overflow-auto rounded-md bg-white py-1 text-base  dark:bg-zinc-800 dark:text-zinc-200 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {categoriesOptions.map((category) => (
                          <Listbox.Option
                            key={category}
                            className={({ active }) =>
                              cn(
                                active
                                  ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                  : "text-gray-900 dark:text-gray-200 ",
                                "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                              )
                            }
                            value={category}
                            onClick={() => {
                              setCurrentPage(1);
                            }}
                          >
                            {({ selected, active }) => (
                              <>
                                <span
                                  className={cn(
                                    selected ? "font-semibold" : "font-normal",
                                    "block truncate"
                                  )}
                                >
                                  {category}
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
          ) : null}
          {/* Filter by category end */}

          {/* Sort start */}
          <Listbox
            value={selectedSort}
            onChange={(value) => {
              changeSort(value);
            }}
          >
            {({ open }) => (
              <div className="flex items-center gap-x-2  max-sm:w-full max-sm:justify-between">
                <Listbox.Label className="text-base font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-sm">
                  Sort by
                </Listbox.Label>
                <div className="relative flex-1 w-32">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left  dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 text-gray-900   ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
                    <span className="block truncate">
                      {sortOptions[selectedSort]}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
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
                          onClick={() => {
                            setCurrentPage(1);
                          }}
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

          {/* Status start */}
          <Listbox
            value={selectedStatus}
            onChange={(value) => {
              changeStatus(value);
            }}
          >
            {({ open }) => (
              <div className="flex items-center gap-x-2  max-sm:w-full max-sm:justify-between">
                <Listbox.Label className="text-base font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-sm">
                  Status
                </Listbox.Label>
                <div className="relative flex-1 w-max">
                  <Listbox.Button className="relative w-full cursor-default  dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900  ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
                    <span className="block truncate">
                      {statuses[selectedStatus]}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>

                  <Transition
                    show={open}
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-10 dark:bg-zinc-800 dark:text-zinc-200 mt-1 max-h-60 w-max overflow-auto rounded-md bg-white py-1 text-base  ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {Object.keys(statuses).map((statusOption) => (
                        <Listbox.Option
                          key={statusOption}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                : "text-gray-900 dark:text-gray-200 ",
                              "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                            )
                          }
                          value={statusOption}
                          onClick={() => {
                            setCurrentPage(1);
                          }}
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={cn(
                                  selected ? "font-semibold" : "font-normal",
                                  "block truncate"
                                )}
                              >
                                {statuses[statusOption as StatusOptions]}
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
          {/* Status end */}
        </div>
      </div>
      <div className="h-full w-full my-8">
        {grants.length > 0 ? (
          // <div className="grid grid-cols-4 justify-items-center gap-3 pb-20 max-2xl:grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          //   {grants.map((grant, index) => {
          //     return <GrantCard key={grant.uid} grant={grant} index={index} />;
          //   })}
          // </div>

          <InfiniteScroll
            dataLength={grants.length}
            next={loadMore}
            hasMore={haveMore}
            loader={null}
            style={{
              width: "100%",
              height: "100%",
            }}
          >
            <AutoSizer disableHeight>
              {({ width }) => {
                const columnCounter = Math.floor(width / 240)
                  ? Math.floor(width / 240) > 4
                    ? 4
                    : Math.floor(width / 240)
                  : 1;
                const columnWidth = Math.floor(width / columnCounter);
                const gutterSize = 20;
                const height = Math.ceil(grants.length / columnCounter) * 360;
                return (
                  <Grid
                    height={height + 120}
                    width={width}
                    rowCount={Math.ceil(grants.length / columnCounter)}
                    rowHeight={360}
                    columnWidth={columnWidth - 20 < 240 ? 240 : columnWidth - 5}
                    columnCount={columnCounter}
                    cellRenderer={({ columnIndex, key, rowIndex, style }) => {
                      const grant =
                        grants[rowIndex * columnCounter + columnIndex];
                      return (
                        <div
                          key={key}
                          style={{
                            ...style,
                            left:
                              columnIndex === 0
                                ? +(style.left || 0)
                                : +(style.left || 0) + gutterSize,
                            width:
                              columnIndex === 0
                                ? +(style.width || 0)
                                : +(style.width || 0) - gutterSize,
                            top:
                              rowIndex === 0
                                ? +(style.top || 0)
                                : +(style.top || 0) + gutterSize,
                            height: +(style.height || 0) - gutterSize,
                          }}
                        >
                          {grant && (
                            <div
                              style={{
                                height: "100%",
                              }}
                            >
                              <GrantCard
                                index={rowIndex * 4 + columnIndex}
                                key={grant.uid}
                                rawGrant={grant}
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
        {loading ? (
          <div className="w-full py-8 flex items-center justify-center">
            <Spinner />
          </div>
        ) : null}
      </div>
    </div>
  );
};
