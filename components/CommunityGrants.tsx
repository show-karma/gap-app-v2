"use client";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { useCommunityStore } from "@/store/community";
import { SortByOptions, StatusOptions, MaturityStageOptions } from "@/types";
import { zeroUID } from "@/utilities/commons";
import { getCommunityProjectsV2 } from "@/utilities/queries/getCommunityDataV2";
import { CommunityStatsV2, ProjectV2, CommunityProjectsV2Response } from "@/types/community";
import { projectV2ToGrant } from "@/utilities/adapters/projectV2ToGrant";
import { cn } from "@/utilities/tailwind";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import { Hex } from "viem";
import { GrantCard } from "./GrantCard";
import { ProgramFilter } from "./Pages/Communities/Impact/ProgramFilter";
import { TrackFilter } from "./Pages/Communities/Impact/TrackFilter";
import { CardListSkeleton } from "./Pages/Communities/Loading";
import { errorManager } from "./Utilities/errorManager";
import { ProgramBanner } from "./ProgramBanner";

const getStatusFromMaturityStage = (
  stage: MaturityStageOptions
): StatusOptions | undefined => {
  if (stage === "all") return undefined;
  return `maturity-stage-${stage}` as StatusOptions;
};

const mapSortToApiValue = (sortOption: SortByOptions): string => {
  const sortMappings: Record<SortByOptions, string> = {
    recent: "recent",
    completed: "completed",
    milestones: "milestones",
    txnCount: "transactions_desc",
  };
  return sortMappings[sortOption];
};

const sortOptions: Record<SortByOptions, string> = {
  recent: "Recent",
  completed: "Completed",
  milestones: "Milestones",
  txnCount: "No. of Txns",
};

const maturityStages: Record<MaturityStageOptions, string> = {
  all: "All Stages",
  "0": "Stage 0",
  "1": "Stage 1",
  "2": "Stage 2",
  "3": "Stage 3",
  "4": "Stage 4",
};

interface CommunityGrantsProps {
  categoriesOptions: string[];
  defaultSelectedCategories: string[];
  defaultSortBy: SortByOptions;
  defaultSelectedMaturityStage: MaturityStageOptions;
  communityUid: string;
  communityStats: CommunityStatsV2;
  initialProjects: CommunityProjectsV2Response;
}

export const CommunityGrants = ({
  categoriesOptions,
  defaultSelectedCategories,
  defaultSortBy,
  defaultSelectedMaturityStage,
  communityUid,
  communityStats,
  initialProjects,
}: CommunityGrantsProps) => {
  const params = useParams();
  const communityId = params.communityId as string;

  const [currentPage, setCurrentPage] = useState(1);

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

  const [selectedMaturityStage, changeMaturityStageQuery] = useQueryState(
    "maturityStage",
    {
      defaultValue: defaultSelectedMaturityStage,
      serialize: (value) => value,
      parse: (value) =>
        value
          ? (value as MaturityStageOptions)
          : ("all" as MaturityStageOptions),
    }
  );

  const [selectedProgramId, changeSelectedProgramIdQuery] = useQueryState<
    string | null
  >("programId", {
    defaultValue: null,
    serialize: (value) => value ?? "",
    parse: (value) => value || null,
  });

  const [selectedTrackIds, changeSelectedTrackIdsQuery] = useQueryState<
    string[] | null
  >("trackIds", {
    defaultValue: null,
    serialize: (value) => value?.join(",") ?? "",
    parse: (value) => (value ? value.split(",") : null),
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [projects, setProjects] = useState<ProjectV2[]>(initialProjects.payload);
  const itemsPerPage = 12;
  const { totalGrants, setTotalGrants } = useCommunityStore();
  const [haveMore, setHaveMore] = useState(initialProjects.pagination.hasNextPage);
  const [paginationInfo, setPaginationInfo] = useState<{
    grantsNo?: number;
    projectsNo?: number;
  }>({
    grantsNo: communityStats.totalGrants,
    projectsNo: communityStats.totalProjects,
  });

  const selectedCategoriesIds = useMemo(
    () => selectedCategories.join("_"),
    [selectedCategories]
  );

  useEffect(() => {
    if (!communityId || communityId === zeroUID) return;

    const fetchNewProjects = async () => {
      if (loading) return; // Prevent multiple simultaneous calls
      
      setLoading(true);
      try {
        const response = await getCommunityProjectsV2(communityId, {
          page: currentPage,
          limit: itemsPerPage,
          sortBy: mapSortToApiValue(selectedSort),
          status: getStatusFromMaturityStage(selectedMaturityStage),
          categories: selectedCategoriesIds.split("_").filter(Boolean).join(","),
          selectedProgramId: selectedProgramId || undefined,
          selectedTrackIds: selectedTrackIds || undefined,
        });

        if (response.payload && response.payload.length) {
          setHaveMore(response.pagination.hasNextPage);
          setProjects((prev) =>
            currentPage === 1 ? response.payload : [...prev, ...response.payload]
          );
          setTotalGrants(response.pagination.totalCount);
        } else {
          setHaveMore(false);
          if (currentPage === 1) {
            setProjects([]);
            setTotalGrants(0);
            setPaginationInfo({
              grantsNo: 0,
              projectsNo: 0,
            });
          }
        }
      } catch (error: any) {
        console.log("error", error);
        errorManager("Error while fetching community projects", error, {
          sortBy: selectedSort,
          status: getStatusFromMaturityStage(selectedMaturityStage),
          categories: selectedCategoriesIds.split("_"),
          selectedProgramId: selectedProgramId || undefined,
          selectedTrackIds: selectedTrackIds || undefined,
          page: currentPage,
          pageLimit: itemsPerPage,
        });
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNewProjects();
  }, [
    communityId,
    selectedSort,
    selectedCategoriesIds,
    selectedProgramId,
    selectedTrackIds,
    selectedMaturityStage,
    currentPage,
  ]);

  // Separate effect to handle initial projects
  useEffect(() => {
    if (currentPage === 1 && projects.length === 0 && initialProjects.payload.length > 0) {
      setProjects(initialProjects.payload);
      setHaveMore(initialProjects.pagination.hasNextPage);
      setTotalGrants(initialProjects.pagination.totalCount);
    }
  }, [initialProjects, projects.length, currentPage]);

  const changeSort = async (newValue: SortByOptions) => {
    setCurrentPage(1);
    setProjects([]);
    changeSortQuery(newValue);
  };
  
  const changeMaturityStage = async (newValue: MaturityStageOptions) => {
    setCurrentPage(1);
    setProjects([]);
    changeMaturityStageQuery(newValue);
  };
  
  const changeCategories = async (newValue: string[]) => {
    setCurrentPage(1);
    setProjects([]);
    changeCategoriesQuery(newValue);
  };

  const loadMore = useCallback(() => {
    if (!loading && haveMore) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [loading, haveMore]);

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
              setCurrentPage(1);
              setProjects([]);
            }}
          />

          <div className="flex flex-1 flex-row gap-8 justify-end flex-wrap">
            {selectedProgramId ? (
              <TrackFilter
                onChange={(trackIds) => {
                  changeSelectedTrackIdsQuery(trackIds);
                  setCurrentPage(1);
                  setProjects([]);
                }}
                communityUid={communityUid}
                selectedTrackIds={selectedTrackIds || []}
              />
            ) : null}
            
            {categoriesOptions.length ? (
              <Listbox
                value={selectedCategories}
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

            {communityId === "celo" && (
              <Listbox
                value={selectedMaturityStage}
                onChange={(value) => {
                  changeMaturityStage(value);
                }}
              >
                {({ open }) => (
                  <div className="flex items-center gap-x-2  max-sm:w-full max-sm:justify-between">
                    <div className="relative flex-1 w-max">
                      <Listbox.Button
                        id="maturity-stage-button"
                        className="cursor-pointer items-center relative w-full rounded-md pr-8 text-left  sm:text-sm sm:leading-6 text-black dark:text-white text-base font-normal"
                      >
                        <span className="flex flex-row gap-1">
                          {maturityStages[selectedMaturityStage]}
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
                          {Object.keys(maturityStages).map((stageOption) => (
                            <Listbox.Option
                              key={stageOption}
                              className={({ active }) =>
                                cn(
                                  active
                                    ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                    : "text-gray-900 dark:text-gray-200 ",
                                  "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                                )
                              }
                              value={stageOption}
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
                                    {
                                      maturityStages[
                                        stageOption as MaturityStageOptions
                                      ]
                                    }
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
            )}
          </div>
        </div>
      </div>
      <ProgramBanner />
      <section className="flex flex-col gap-4 md:flex-row">
        <div className="h-full w-full mb-8">
          {projects.length > 0 ? (
            <InfiniteScroll
              dataLength={projects.length}
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
                  const columns = Math.floor(width / 360);
                  const columnCounter = columns
                    ? columns > 6
                      ? 6
                      : columns
                    : 1;
                  const columnWidth = Math.floor(width / columnCounter);
                  const gutterSize = 20;
                  const height = Math.ceil(projects.length / columnCounter) * 360;
                  return (
                    <Grid
                      key={`${width}-${columnCounter}`}
                      height={height + 120}
                      width={width}
                      rowCount={Math.ceil(projects.length / columnCounter)}
                      rowHeight={360}
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
                            {project && (
                              <div
                                style={{
                                  height: "100%",
                                }}
                              >
                                <GrantCard
                                  index={rowIndex * 4 + columnIndex}
                                  key={project.uid}
                                  grant={projectV2ToGrant(project)}
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
