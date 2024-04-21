import { SortByOptions, StatusOptions } from "@/types";
import { cn } from "@/utilities/tailwind";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import pluralize from "pluralize";
import { FC, Fragment } from "react";

interface Props {
  selectedValue: string[];
  label: string;
  option: string[];
  setCurrentPage: (value: React.SetStateAction<number>) => void;
  changeFunc: (newValue: string[]) => Promise<void>;
}

export const FilterComp: FC<Props> = ({
  selectedValue,
  label,
  option,
  setCurrentPage,
  changeFunc,
}) => {
  return (
    <Listbox
      value={selectedValue}
      onChange={(values) => changeFunc(values)}
      multiple
    >
      {({ open }) => (
        <div className="flex items-center gap-x-2 max-sm:w-full max-sm:justify-between">
          <Listbox.Label className="text-base font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-sm">
            {label}
          </Listbox.Label>
          <div className="relative flex-1 w-max">
            <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
              {selectedValue.length > 0 ? (
                <p className="flex flex-row gap-1">
                  {selectedValue.length}
                  <span>
                    {pluralize("category", selectedValue.length)} selected
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
                {option.map((category) => (
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
};

interface SortProps {
  label: string;
  sortOption?: Record<SortByOptions, string>;
  statusOption?: Record<StatusOptions, string>;
  selectedSort?: SortByOptions;
  selectedStatus?: StatusOptions;
  setCurrentPage: (value: React.SetStateAction<number>) => void;
  sort: (newValue: SortByOptions) => Promise<void>;
  status: (newValue: StatusOptions) => Promise<void>;
}

export const Sorting: FC<SortProps> = ({
  setCurrentPage,
  sort,
  status,
  label,
  selectedStatus,
  selectedSort,
  sortOption,
  statusOption,
}) => {
  return (
    <>
      {selectedSort ? (
        <Listbox
          value={selectedSort}
          onChange={(value) => {
            sort(value);
          }}
        >
          {({ open }) => (
            <div className="flex items-center gap-x-2  max-sm:w-full max-sm:justify-between">
              <Listbox.Label className="text-base font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-sm">
                {label}
              </Listbox.Label>
              <div className="relative flex-1 w-32">
                <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left  dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 text-gray-900   ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
                  {sortOption && (
                    <span className="block truncate">
                      {sortOption[selectedSort]}
                    </span>
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
                  <Listbox.Options className="absolute  z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base  dark:bg-zinc-800 dark:text-zinc-200 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {sortOption &&
                      Object.keys(sortOption).map((Options) => (
                        <Listbox.Option
                          key={Options}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                : "text-gray-900 dark:text-gray-200 ",
                              "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                            )
                          }
                          value={Options}
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
                                {sortOption[Options as SortByOptions]}
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
      ) : (
        <Listbox
          value={selectedStatus}
          onChange={(value) => {
            status(value);
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
                    {statusOption && selectedStatus ? (
                      <span className="block truncate">
                        {statusOption[selectedStatus]}
                      </span>
                    ) : (
                      ""
                    )}
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
                    {statusOption &&
                      Object.keys(statusOption).map((Options) => (
                        <Listbox.Option
                          key={Options}
                          className={({ active }) =>
                            cn(
                              active
                                ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                : "text-gray-900 dark:text-gray-200 ",
                              "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                            )
                          }
                          value={Options}
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
                                {statusOption[Options as StatusOptions]}
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
    </>
  );
};
