import React, { useEffect } from "react";
import { Fragment, useState } from "react";
import {
  ChatBubbleLeftEllipsisIcon,
  CheckIcon,
  ChevronUpDownIcon,
  TagIcon,
  UserCircleIcon,
} from "@heroicons/react/20/solid";
import { Listbox, Transition } from "@headlessui/react";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useRouter } from "next/router";
import { CommunityFeed } from "@/components/Feed";
import { blo } from "blo";
import { cn, formatDate, zeroUID } from "@/utilities";
import { Hex } from "viem";
import { getGrants } from "@/utilities/sdk/communities";
import { Grant } from "@show-karma/karma-gap-sdk";
import { Spinner } from "../Utilities/Spinner";

const categories = [
  { id: 1, name: "Arb - Community Growth" },
  { id: 2, name: "Arb - DAO Contribution" },
  { id: 3, name: "Arb - Data & Analytics" },
  { id: 4, name: "Arb - Education" },
  { id: 5, name: "Arb - Gaming" },
  { id: 6, name: "Arb - New Protocol" },
  { id: 7, name: "Arb - Protocol" },
  { id: 8, name: "Arb - Tool" },
  { id: 9, name: "STIP" },
];

const sortOptions = [
  { id: 1, name: "Recent" },
  { id: 2, name: "Completed" },
  { id: 3, name: "Milestones" },
];

const statuses = [
  { id: 1, name: "All" },
  { id: 2, name: "To Complete" },
  { id: 3, name: "Completed" },
  { id: 4, name: "Starting" },
];

export default function CommunityGrants() {
  const router = useRouter();
  const communityId = router.query.communityId as string;

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(
    categories[1]
  );
  const [selectedSort, setSelectedSort] = useState(sortOptions[1]);
  const [selectedStatus, setSelectedStatus] = useState(statuses[1]);

  // Call API
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [grants, setGrants] = useState<Grant[]>([]); // Data returned from the API
  const itemsPerPage = 12; // Set the total number of items you want returned from the API

  useEffect(() => {
    const fetchGrants = async () => {
      setLoading(true);
      try {
        if (!communityId || communityId === zeroUID) return;
        const fetchedGrants = await getGrants(communityId as Hex);
        if (fetchedGrants) {
          setGrants(fetchedGrants.slice(0, itemsPerPage));
          // setGrantsToShow(fetchedGrants.slice(0, pageLimit));
        }
      } catch (error) {
        console.log("error", error);
        setGrants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGrants();
  }, [communityId]);

  return (
    <div className="w-9/12">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold">Total Grants ({grants.length})</div>
        <div className="flex items-center gap-x-5">
          {/* Filter by category start */}
          <Listbox
            value={selectedCategoryFilter}
            onChange={setSelectedCategoryFilter}
          >
            {({ open }) => (
              <div className="flex items-center gap-x-2">
                <Listbox.Label className="block text-sm font-medium leading-6 text-gray-900">
                  Filter by category
                </Listbox.Label>
                <div className="relative flex-1 w-56">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
                    <span className="block truncate">
                      {selectedCategoryFilter.name}
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
                      {categories.map((category) => (
                        <Listbox.Option
                          key={category.id}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-primary-600 text-white"
                                : "text-gray-900",
                              "relative cursor-default select-none py-2 pl-3 pr-9"
                            )
                          }
                          value={category}
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={cn(
                                  selected ? "font-semibold" : "font-normal",
                                  "block truncate"
                                )}
                              >
                                {category.name}
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
                <Listbox.Label className="block text-sm font-medium leading-6 text-gray-900">
                  Sort by
                </Listbox.Label>
                <div className="relative flex-1 w-32">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
                    <span className="block truncate">{selectedSort.name}</span>
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
                      {sortOptions.map((sortOption) => (
                        <Listbox.Option
                          key={sortOption.id}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-primary-600 text-white"
                                : "text-gray-900",
                              "relative cursor-default select-none py-2 pl-3 pr-9"
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
                                {sortOption.name}
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
                <Listbox.Label className="block text-sm font-medium leading-6 text-gray-900">
                  Status
                </Listbox.Label>
                <div className="relative flex-1 w-36">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
                    <span className="block truncate">
                      {selectedStatus.name}
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
                      {statuses.map((sortOption) => (
                        <Listbox.Option
                          key={sortOption.id}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-primary-600 text-white"
                                : "text-gray-900",
                              "relative cursor-default select-none py-2 pl-3 pr-9"
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
                                {sortOption.name}
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
        <div className="w-full py-8 flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-4 gap-5">
          {grants.map((grant, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 p-5 rounded-xl shadow-md"
            >
              <div className="text-lg font-bold">{grant.project?.title}</div>
              <div className="text-sm text-gray-900">
                {grant.details?.title}
              </div>

              <div className="mt-3 text-gray-600 text-sm font-semibold">
                Summary
              </div>
              <div className="text-sm text-gray-900 text-ellipsis line-clamp-2">
                {grant.details?.description}
              </div>

              <div className="mt-3 space-x-2">
                {grant.categories?.map((category, index) => (
                  <span
                    className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                    key={index}
                  >
                    {category}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Built by</span>
                  <span>
                    <img
                      src={blo(grant.members[0], 8)}
                      alt={grant.members[0]}
                      className="h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                    />
                  </span>
                </div>

                <div className="text-xs text-gray-600">
                  Created on &nbsp;
                  {formatDate(grant.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
