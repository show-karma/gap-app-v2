"use client";
/* eslint-disable @next/next/no-img-element */
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { useCommunityStore } from "@/store/community";
import { SortByOptions, StatusOptions } from "@/types";
import { zeroUID } from "@/utilities/commons";
import { getGrants } from "@/utilities/sdk/communities/getGrants";
import { getPrograms } from "@/utilities/sdk/communities/getPrograms";
import { cn } from "@/utilities/tailwind";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { Fragment, useEffect, useMemo, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import { Hex } from "viem";
import { GrantCard } from "./GrantCard";
import { ProgramFilter } from "./Pages/Communities/Impact/ProgramFilter";
import { TrackFilter } from "./Pages/Communities/Impact/TrackFilter";
import { CardListSkeleton } from "./Pages/Communities/Loading";
import { errorManager } from "./Utilities/errorManager";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

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
  communityUid: string;
}

export const CommunityGrants = ({
  categoriesOptions,
  defaultSelectedCategories,
  defaultSortBy,
  defaultSelectedStatus,
  communityUid,
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
  const [programs, setPrograms] = useState<GrantProgram[]>([]);
  const [programsLoading, setProgramsLoading] = useState<boolean>(true);

  const [selectedProgramId, changeSelectedProgramIdQuery] = useQueryState<
    string | null
  >("programId", {
    defaultValue: null,
    serialize: (value) => value ?? "",
    parse: (value) => value || null,
  });

  // Add state for selected track IDs
  const [selectedTrackIds, changeSelectedTrackIdsQuery] = useQueryState<
    string[] | null
  >("trackIds", {
    defaultValue: null,
    serialize: (value) => value?.join(",") ?? "",
    parse: (value) => (value ? value.split(",") : null),
  });

  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [grants, setGrants] = useState<IGrantResponse[]>([]); // Data returned from the API
  const itemsPerPage = 12; // Set the total number of items you want returned from the API
  const { totalGrants, setTotalGrants } = useCommunityStore();
  const [haveMore, setHaveMore] = useState(true); // Boolean to check if there are more grants to load
  const [paginationInfo, setPaginationInfo] = useState<{
    grantsNo?: number;
    projectsNo?: number;
  } | null>(null);
  const selectedCategoriesIds = useMemo(
    () => selectedCategories.join("_"),
    [selectedCategories]
  );

  useEffect(() => {
    if (!communityId || communityId === zeroUID) return;

    setProgramsLoading(true);
    const fetchPrograms = async () => {
      const programs = await getPrograms(communityId as Hex);
      const orderProgramsByTitle = (programs: GrantProgram[]) => {
        return programs.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });
      };

      setPrograms(orderProgramsByTitle(programs));
      setProgramsLoading(false);
    };
    fetchPrograms();
  }, [communityId]);

  useEffect(() => {
    if (!communityId || communityId === zeroUID) return;

    const fetchNewGrants = async () => {
      setLoading(true);
      try {
        const {
          grants: fetchedGrants,
          pageInfo,
          uniqueProjectCount,
        } = await getGrants(
          communityId as Hex,
          {
            sortBy: selectedSort,
            status: selectedStatus,
            categories: selectedCategoriesIds.split("_"),
            selectedProgramId: selectedProgramId || undefined,
            selectedTrackIds: selectedTrackIds || undefined,
          },
          {
            page: currentPage,
            pageLimit: itemsPerPage,
          }
        );
        setPaginationInfo({
          grantsNo: pageInfo.totalItems,
          projectsNo: uniqueProjectCount,
        });
        if (fetchedGrants && fetchedGrants.length) {
          setHaveMore(fetchedGrants.length === itemsPerPage);
          setGrants((prev) =>
            currentPage === 0 ? fetchedGrants : [...prev, ...fetchedGrants]
          );
          setTotalGrants(pageInfo?.totalItems || totalGrants);
        } else {
          if (currentPage === 0) {
            setHaveMore(false);
            setGrants([]);
            setTotalGrants(0);
            setPaginationInfo({
              grantsNo: 0,
              projectsNo: 0,
            });
          }
        }
      } catch (error: any) {
        console.log("error", error);
        errorManager("Error while fetching community grants", error, {
          sortBy: selectedSort,
          status: selectedStatus,
          categories: selectedCategoriesIds.split("_"),
          selectedProgramId: selectedProgramId || undefined,
          selectedTrackIds: selectedTrackIds || undefined,
          page: currentPage,
          pageLimit: itemsPerPage,
        });
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
    selectedProgramId,
    selectedTrackIds,
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

  const resetTrackIds = () => {
    changeSelectedTrackIdsQuery(null);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between flex-row flex-wrap-reverse max-lg:flex-wrap max-lg:flex-col-reverse max-lg:justify-start max-lg:items-start gap-3 max-lg:gap-4">
        <div className="flex items-center gap-x-3 flex-wrap gap-y-2 w-full">
          <ProgramFilter
            onChange={(programId) => {
              resetTrackIds();
              changeSelectedProgramIdQuery(programId);
              setCurrentPage(0);
              setGrants([]);
            }}
          />

          <div className="flex flex-1 flex-row gap-8 justify-end flex-wrap">
            {selectedProgramId ? (
              <TrackFilter
                onChange={(trackIds) => {
                  changeSelectedTrackIdsQuery(trackIds);
                  setCurrentPage(0);
                  setGrants([]);
                }}
                communityUid={communityUid}
                selectedTrackIds={selectedTrackIds || []}
              />
            ) : null}
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
                    <div className="relative flex-1 w-max">
                      <Listbox.Button className="cursor-pointer items-center relative w-full  rounded-md pr-8 text-left  sm:text-sm sm:leading-6 text-black dark:text-white text-base font-normal">
                        {selectedCategories.length > 0 ? (
                          <p className="flex flex-row gap-1">
                            {selectedCategories.length}
                            <span>
                              {pluralize("category", selectedCategories.length)}{" "}
                              selected
                            </span>
                          </p>
                        ) : (
                          <p>All Categories</p>
                        )}
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronDownIcon
                            className="h-4 w-4 text-gray-400"
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
                                      selected
                                        ? "font-semibold"
                                        : "font-normal",
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
                <div className="flex items-center gap-x-2 max-sm:w-full max-sm:justify-between">
                  <div className="relative flex-1 w-max">
                    <Listbox.Button
                      id="sort-by-button"
                      className="cursor-pointer items-center relative w-full rounded-md pr-8 text-left  sm:text-sm sm:leading-6 text-black dark:text-white text-base font-normal"
                    >
                      <span className="flex flex-row gap-1">
                        Sort by {sortOptions[selectedSort]}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDownIcon
                          className="h-4 w-4 text-gray-400"
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
                  <div className="relative flex-1 w-max">
                    <Listbox.Button
                      id="status-button"
                      className="cursor-pointer items-center relative w-full rounded-md pr-8 text-left  sm:text-sm sm:leading-6 text-black dark:text-white text-base font-normal"
                    >
                      <span className="flex flex-row gap-1">
                        {statuses[selectedStatus]}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDownIcon
                          className="h-4 w-4 text-gray-400"
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
      </div>

      <section className="flex flex-col gap-4 md:flex-row">
        <div className="h-full w-full mb-8">
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
                      columnWidth={
                        columnWidth - 20 < 240 ? 240 : columnWidth - 5
                      }
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
                                  grant={grant}
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
            <div className="w-full flex items-center justify-center">
              <CardListSkeleton />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};
