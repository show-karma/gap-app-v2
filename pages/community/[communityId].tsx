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
import { INDEXER } from "@/utilities/indexer/list";
import { useRouter } from "next/router";
import { CommunityFeed } from "@/components/Feed";
import { blo } from "blo";

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

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const cards = [
  {
    name: "Open Source Observer",
    title: "Plurality labs - firestarters",
    createdDate: "2022-01-01",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    badges: ["Badge1", "Badge2", "Badge3"],
    createdBy: "0x1234567890123456789012345678901234567890",
  },
  {
    name: "Open Source Enthusiast",
    title: "Innovation labs - trailblazers",
    createdDate: "2022-02-01",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    badges: ["Badge4", "Badge5", "Badge6"],
    createdBy: "0x1234567890123456789012345678901234567890",
  },
  {
    name: "Open Source Contributor",
    title: "Tech labs - pioneers",
    createdDate: "2022-03-01",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    badges: ["Badge7", "Badge8", "Badge9"],
    createdBy: "0x1234567890123456789012345678901234567890",
  },
  {
    name: "Open Source Contributor",
    title: "Tech labs - pioneers",
    createdDate: "2022-03-01",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    badges: ["Badge7", "Badge8", "Badge9"],
    createdBy: "0x1234567890123456789012345678901234567890",
  },
];

export default function Index() {
  const router = useRouter();
  const communityId = router.query.communityId as string;

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(
    categories[1]
  );
  const [selectedSort, setSelectedSort] = useState(sortOptions[1]);
  const [selectedStatus, setSelectedStatus] = useState(statuses[1]);

  const [feed, setFeed] = useState<[]>([]);
  const [feedLoading, setFeedLoading] = useState<boolean>(true);
  // Call API
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [data, setData] = useState<[]>([]); // Data returned from the API
  const itemsPerPage = 12; // Set the total number of items you want returned from the API

  const callAPI = async () => {
    setLoading(true);
    try {
      const [data, error, pageInfo]: any = await fetchData(
        `/droposals/minters?limit=${itemsPerPage}`
      );
      setData(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const callFeedAPI = async () => {
    setFeedLoading(true);
    try {
      const [data, error, pageInfo]: any = await fetchData(
        `${INDEXER.COMMUNITY.FEED(communityId as string)}?limit=${itemsPerPage}`
      );
      console.log(data);
      setFeed(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    callFeedAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-5">
        <div className="py-8 rounded-xl bg-primary-900 border border-primary-800 text-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img
              src="/logos/arbitrum_400x400.png"
              className="h-14 w-14 rounded-full"
            />
          </div>
          <div className="mt-3 text-3xl font-black text-white">
            Arbitrum Community Grants
          </div>
        </div>

        <div className="mt-12 flex gap-x-8">
          {/* Grants cards start */}
          <div className="w-9/12">
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">Total Grants (151)</div>
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
                                  classNames(
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
                                      className={classNames(
                                        selected
                                          ? "font-semibold"
                                          : "font-normal",
                                        "block truncate"
                                      )}
                                    >
                                      {category.name}
                                    </span>

                                    {selected ? (
                                      <span
                                        className={classNames(
                                          active
                                            ? "text-white"
                                            : "text-primary-600",
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
                          <span className="block truncate">
                            {selectedSort.name}
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
                            {sortOptions.map((sortOption) => (
                              <Listbox.Option
                                key={sortOption.id}
                                className={({ active }) =>
                                  classNames(
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
                                      className={classNames(
                                        selected
                                          ? "font-semibold"
                                          : "font-normal",
                                        "block truncate"
                                      )}
                                    >
                                      {sortOption.name}
                                    </span>

                                    {selected ? (
                                      <span
                                        className={classNames(
                                          active
                                            ? "text-white"
                                            : "text-primary-600",
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
                                  classNames(
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
                                      className={classNames(
                                        selected
                                          ? "font-semibold"
                                          : "font-normal",
                                        "block truncate"
                                      )}
                                    >
                                      {sortOption.name}
                                    </span>

                                    {selected ? (
                                      <span
                                        className={classNames(
                                          active
                                            ? "text-white"
                                            : "text-primary-600",
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
            <div className="mt-8 grid grid-cols-4 gap-5">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 p-5 rounded-xl shadow-md"
                >
                  <div className="text-lg font-bold">{card.name}</div>
                  <div className="text-sm text-gray-900">{card.title}</div>

                  <div className="mt-3 text-gray-600 text-sm font-semibold">
                    Summary
                  </div>
                  <div className="text-sm text-gray-900 text-ellipsis line-clamp-2">
                    {card.description}
                  </div>

                  <div className="mt-3 space-x-2">
                    {card.badges.map((badge, index) => (
                      <span
                        className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                        key={index}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Built by</span>
                      <span>
                        <img
                          src={blo(card.createdBy, 8)}
                          alt={card.createdBy}
                          className="h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                        />
                      </span>
                    </div>

                    <div className="text-xs text-gray-600">
                      Created on &nbsp;
                      {new Date(card.createdDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Grants cards end */}
          {/* Community feed start */}
          <CommunityFeed />
          {/* Community feed end */}
        </div>
      </div>
    </>
  );
}
