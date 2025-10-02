"use client";
import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import pluralize from "pluralize";
import { cn } from "@/utilities/tailwind";

interface CategoryFilterProps {
  categories: string[];
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
}

export function CategoryFilter({
  categories,
  selectedCategories,
  onChange,
}: CategoryFilterProps) {
  if (!categories.length) return null;

  return (
    <Listbox value={selectedCategories} onChange={onChange} multiple>
      {({ open }) => (
        <div className="flex items-center gap-x-2 max-sm:w-full max-sm:justify-between">
          <div className="relative flex-1 w-max">
            <Listbox.Button className="cursor-pointer items-center relative w-full rounded-md pr-8 text-left sm:text-sm sm:leading-6 text-black dark:text-white text-base font-normal">
              {selectedCategories.length > 0 ? (
                <p className="flex flex-row gap-1">
                  {selectedCategories.length}
                  <span>
                    {pluralize("category", selectedCategories.length)} selected
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
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-max overflow-auto rounded-md bg-white py-1 text-base dark:bg-zinc-800 dark:text-zinc-200 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {categories.map((category) => (
                  <Listbox.Option
                    key={category}
                    className={({ active }) =>
                      cn(
                        active
                          ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                          : "text-gray-900 dark:text-gray-200",
                        "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                      )
                    }
                    value={category}
                  >
                    {({ selected }) => (
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
}