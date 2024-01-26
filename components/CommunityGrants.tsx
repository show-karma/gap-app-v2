/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo } from "react";
import { Fragment, useState } from "react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { Listbox, Transition } from "@headlessui/react";
import { useRouter } from "next/router";
import { INDEXER, cn, formatDate, zeroUID } from "@/utilities";
import { Hex } from "viem";
import { getGrants } from "@/utilities/sdk/communities";
import { Grant } from "@show-karma/karma-gap-sdk";
import { Spinner } from "./Utilities/Spinner";
import { GrantCard } from "./GrantCard";
import Pagination from "./Utilities/Pagination";
import { SortByOptions, StatusOptions } from "@/types";
import fetchData from "@/utilities/fetchData";
import pluralize from "pluralize";

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

export const CommunityGrants = () => {
  const router = useRouter();
  const communityId = router.query.communityId as string;
  const [categoriesOptions, setCategoriesOptions] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [selectedSort, setSelectedSort] = useState<SortByOptions>(
    "recent" as SortByOptions
  );
  const [selectedStatus, setSelectedStatus] = useState<StatusOptions>(
    "all" as StatusOptions
  );

  // Call API
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [grants, setGrants] = useState<Grant[]>([]); // Data returned from the API
  const itemsPerPage = 12; // Set the total number of items you want returned from the API
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGrants, setTotalGrants] = useState(0);

  useEffect(() => {
    if (!communityId || communityId === zeroUID) return;

    const getCategories = async () => {
      try {
        const [data]: any = await fetchData(
          INDEXER.COMMUNITY.CATEGORIES(communityId as string)
        );
        if (data.length) {
          const categoriesToOrder = data.map(
            (category: { name: string }) => category.name
          );
          const orderedCategories = categoriesToOrder.sort(
            (a: string, b: string) => {
              return a.localeCompare(b, "en");
            }
          );
          setCategoriesOptions(orderedCategories);
        }
      } catch (error) {
        // setCategoriesOptions([]);
        console.error(error);
      }
    };

    const fetchGrants = async () => {
      setLoading(true);
      try {
        const fetchedGrants = await getGrants(communityId as Hex, {
          sortBy: selectedSort,
          status: selectedStatus,
          categories: selectedCategories,
        });
        if (fetchedGrants) {
          setTotalGrants(fetchedGrants.length);
          setGrants(
            fetchedGrants.slice(
              itemsPerPage * (currentPage - 1),
              itemsPerPage * currentPage
            )
          );
        }
      } catch (error) {
        console.log("error", error);
        setGrants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGrants();
    getCategories();
  }, [
    communityId,
    currentPage,
    selectedSort,
    selectedStatus,
    selectedCategories,
  ]);

  return (
    <div className="w-8/12 max-lg:w-full 2xl:w-9/12">
      <div className="flex items-center justify-between flex-row max-lg:flex-col-reverse max-lg:justify-start max-lg:items-start gap-8 max-lg:gap-4">
        <div className="text-xl font-bold">
          Total Grants {totalGrants ? `(${totalGrants})` : null}
        </div>
        <div className="flex items-center gap-x-5">
          {/* Filter by category start */}
          <Listbox
            value={selectedCategories}
            onChange={setSelectedCategories}
            multiple
          >
            {({ open }) => (
              <div className="flex items-center gap-x-2">
                <Listbox.Label className="block text-sm font-medium leading-6 ">
                  Filter by category
                </Listbox.Label>
                <div className="relative flex-1 w-56">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
                    <p className="block truncate">
                      {selectedCategories.length > 0
                        ? `${selectedCategories.length} 
                        ${pluralize(
                          "category",
                          selectedCategories.length
                        )} selected`
                        : "Categories"}
                    </p>
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
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {categoriesOptions.map((category) => (
                        <Listbox.Option
                          key={category}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-primary-600 text-white"
                                : "text-gray-900",
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
                                    active ? "text-white" : "text-primary-600",
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
          {/* Filter by category end */}

          {/* Sort start */}
          <Listbox value={selectedSort} onChange={setSelectedSort}>
            {({ open }) => (
              <div className="flex items-center gap-x-2">
                <Listbox.Label className="block text-sm font-medium leading-6 ">
                  Sort by
                </Listbox.Label>
                <div className="relative flex-1 w-32">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
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
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {Object.keys(sortOptions).map((sortOption) => (
                        <Listbox.Option
                          key={sortOption}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-primary-600 text-white"
                                : "text-gray-900",
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
                                    active ? "text-white" : "text-primary-600",
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
          <Listbox value={selectedStatus} onChange={setSelectedStatus}>
            {({ open }) => (
              <div className="flex items-center gap-x-2">
                <Listbox.Label className="block text-sm font-medium leading-6 ">
                  Status
                </Listbox.Label>
                <div className="relative flex-1 w-36">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
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
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {Object.keys(statuses).map((statusOption) => (
                        <Listbox.Option
                          key={statusOption}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-primary-600 text-white"
                                : "text-gray-900",
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
                                    active ? "text-white" : "text-primary-600",
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
      {loading ? (
        // Loading state
        <div className="w-full py-8 flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        // Data state
        <div className="w-full flex flex-1 flex-col">
          <div className="my-8 grid grid-cols-3 gap-5 max-sm:grid-cols-1  max-md:grid-cols-1  max-lg:grid-cols-2 max-xl:grid-cols-3 2xl:grid-cols-4">
            {grants.map((grant, index) => (
              <GrantCard index={index} key={grant.uid + +index} grant={grant} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            postsPerPage={itemsPerPage}
            totalPosts={totalGrants}
          />
        </div>
      )}
    </div>
  );
};
