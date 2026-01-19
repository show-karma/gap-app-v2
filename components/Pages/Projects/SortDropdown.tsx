"use client";

import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/solid";
import { Fragment } from "react";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import { cn } from "@/utilities/tailwind";

const sortOptions: Record<ExplorerSortByOptions, string> = {
  updatedAt: "Recently Updated",
  createdAt: "Recently Added",
  title: "Title",
  noOfGrants: "No. of Grants",
  noOfProjectMilestones: "No. of Roadmap items",
  noOfGrantMilestones: "No. of Milestones",
};

interface SortDropdownProps {
  selectedSort: ExplorerSortByOptions;
  selectedSortOrder: ExplorerSortOrder;
  onSortChange: (sort: ExplorerSortByOptions, order: ExplorerSortOrder) => void;
}

export const SortDropdown = ({
  selectedSort,
  selectedSortOrder,
  onSortChange,
}: SortDropdownProps) => {
  const handleChange = (newValue: ExplorerSortByOptions) => {
    if (newValue === selectedSort) {
      onSortChange(selectedSort, selectedSortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(newValue, "desc");
    }
  };

  return (
    <Listbox value={selectedSort} onChange={handleChange}>
      {({ open }) => (
        <div className="flex items-center gap-x-2 max-sm:w-full max-sm:justify-between">
          <Listbox.Label className="text-base font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-sm">
            Sort by
          </Listbox.Label>
          <div className="relative flex-1 w-48">
            <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
              <span className="block truncate">{sortOptions[selectedSort]}</span>
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
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base dark:bg-zinc-800 dark:text-zinc-200 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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

                        {selected ? (
                          <span className="text-blue-600 dark:text-blue-400 absolute inset-y-0 right-0 flex items-center pr-4">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
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
  );
};
