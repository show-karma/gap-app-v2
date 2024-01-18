import React, { useEffect } from "react";
import BlockiesSvg from "blockies-react-svg";
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

export default function Index() {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(
    categories[1]
  );
  const [selectedSort, setSelectedSort] = useState(sortOptions[1]);
  const [selectedStatus, setSelectedStatus] = useState(statuses[1]);

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

  const activity = [
    {
      id: 1,
      type: "comment",
      person: { name: "Eduardo Benz", href: "#" },
      imageUrl:
        "https://images.unsplash.com/photo-1520785643438-5bf77931f493?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=256&h=256&q=80",
      comment:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id. Morbi in vestibulum nec varius. Et diam cursus quis sed purus nam. ",
      date: "6d ago",
      account: "0x1234567890123456789012345678901234567890",
    },
    {
      id: 2,
      type: "assignment",
      person: { name: "Hilary Mahy", href: "#" },
      assigned: { name: "Kristin Watson", href: "#" },
      date: "2d ago",
      account: "0x1234567890123456789012345678901234567890",
    },
    {
      id: 3,
      type: "tags",
      person: { name: "Hilary Mahy", href: "#" },
      tags: [
        { name: "Bug", href: "#", color: "fill-red-500" },
        { name: "Accessibility", href: "#", color: "fill-primary-500" },
      ],
      date: "6h ago",
      account: "0x1234567890123456789012345678901234567890",
    },
    {
      id: 4,
      type: "comment",
      person: { name: "Jason Meyers", href: "#" },
      imageUrl:
        "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=256&h=256&q=80",
      comment:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id. Morbi in vestibulum nec varius. Et diam cursus quis sed purus nam. Scelerisque amet elit non sit ut tincidunt condimentum. Nisl ultrices eu venenatis diam.",
      date: "2h ago",
      account: "0x1234567890123456789012345678901234567890",
    },
  ];

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

  useEffect(() => {
    // callAPI();
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
                        <BlockiesSvg
                          address={card.createdBy}
                          size={8}
                          scale={10}
                          caseSensitive={false}
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
          <div className="w-3/12 ">
            <div className="text-xl font-bold">Community Feed</div>
            {/* Feed start */}
            <div className="flow-root mt-10 bg-white border border-gray-200 p-5 rounded-xl shadow-md">
              <ul role="list" className="-mb-8">
                {activity.map((activityItem, activityItemIdx) => (
                  <li key={activityItem.id}>
                    <div className="relative pb-8">
                      {activityItemIdx !== activity.length - 1 ? (
                        <span
                          className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex items-start space-x-3">
                        {activityItem.type === "comment" ? (
                          <>
                            <div className="relative">
                              {/* <img
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-400 ring-8 ring-white"
                                src={activityItem.imageUrl}
                                alt=""
                              /> */}

                              <BlockiesSvg
                                address={activityItem.account}
                                size={8}
                                scale={10}
                                caseSensitive={false}
                                className="flex items-center justify-center h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                              />

                              <span className="absolute -bottom-0.5 -right-1 rounded-tl bg-white px-0.5 py-px">
                                <ChatBubbleLeftEllipsisIcon
                                  className="h-5 w-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div>
                                <div className="text-sm">
                                  <a
                                    href={activityItem.person.href}
                                    className="font-medium text-gray-900"
                                  >
                                    {activityItem.person.name}
                                  </a>
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500">
                                  Commented {activityItem.date}
                                </p>
                              </div>
                              <div className="mt-2 text-sm text-gray-700">
                                <p>{activityItem.comment}</p>
                              </div>
                            </div>
                          </>
                        ) : activityItem.type === "assignment" ? (
                          <>
                            <div>
                              <div className="relative px-1">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white">
                                  <UserCircleIcon
                                    className="h-5 w-5 text-gray-500"
                                    aria-hidden="true"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 py-1.5">
                              <div className="text-sm text-gray-500">
                                <a
                                  href={activityItem.person.href}
                                  className="font-medium text-gray-900"
                                >
                                  {activityItem.person.name}
                                </a>{" "}
                                assigned{" "}
                                <a
                                  href={activityItem.assigned?.href ?? ""}
                                  className="font-medium text-gray-900"
                                >
                                  {activityItem.assigned?.name ?? ""}
                                </a>{" "}
                                <span className="whitespace-nowrap">
                                  {activityItem.date}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : activityItem.type === "tags" ? (
                          <>
                            <div>
                              <div className="relative px-1">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white">
                                  <TagIcon
                                    className="h-5 w-5 text-gray-500"
                                    aria-hidden="true"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 py-0">
                              <div className="text-sm leading-8 text-gray-500">
                                <span className="mr-0.5">
                                  <a
                                    href={activityItem.person.href}
                                    className="font-medium text-gray-900"
                                  >
                                    {activityItem.person.name}
                                  </a>{" "}
                                  added tags
                                </span>{" "}
                                <span className="mr-0.5">
                                  {activityItem.tags?.map((tag) => (
                                    <Fragment key={tag.name}>
                                      <a
                                        href={tag.href}
                                        className="inline-flex items-center gap-x-1.5 rounded-full px-2 py-1 text-xs font-medium text-gray-900 ring-1 ring-inset ring-gray-200"
                                      >
                                        <svg
                                          className={classNames(
                                            tag.color,
                                            "h-1.5 w-1.5"
                                          )}
                                          viewBox="0 0 6 6"
                                          aria-hidden="true"
                                        >
                                          <circle cx={3} cy={3} r={3} />
                                        </svg>
                                        {tag.name}
                                      </a>{" "}
                                    </Fragment>
                                  ))}
                                </span>
                                <span className="whitespace-nowrap">
                                  {activityItem.date}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* Feed end */}
          </div>
          {/* Community feed end */}
        </div>
      </div>
    </>
  );
}
