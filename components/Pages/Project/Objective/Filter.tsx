"use client";

import { cn } from "@/utilities/tailwind";
import { CheckIcon } from "@heroicons/react/20/solid";
import { Listbox, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useQueryState } from "nuqs";
import { StatusOptions } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { useParams } from "next/navigation";
import { useAllMilestones } from "@/hooks/useAllMilestones";
import { getQueryClient } from "@/utilities/queries/client";

const statuses: Record<StatusOptions, string> = {
  all: "All",
  completed: "Completed",
  pending: "Pending",
};

export const ObjectiveFilter = () => {
  const projectId = useParams().projectId as string;
  const queryClient = getQueryClient();
  const [selectedStatus, changeStatus] = useQueryState<StatusOptions>(
    "status",
    {
      defaultValue: "all",
      serialize: (value) => value,
      parse: (value) =>
        value ? (value as StatusOptions) : ("all" as StatusOptions),
    }
  );

  const { milestones } = useAllMilestones(projectId);

  if (!milestones?.length || !milestones) return null;

  return (
    <div className="flex flex-row gap-6 justify-center items-center">
      <Listbox
        value={selectedStatus}
        onChange={(value) => {
          changeStatus(value);
          queryClient.invalidateQueries({
            queryKey: ["all-milestones", projectId],
          });
        }}
      >
        {({ open }) => (
          <div className="flex items-center gap-x-2  max-sm:w-full max-sm:justify-between">
            <Listbox.Label className="text-[#30374F] dark:text-zinc-400 text-base font-bold">
              Status
            </Listbox.Label>
            <div className="relative flex-1 w-max">
              <Listbox.Button className="relative w-full cursor-default  dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900  ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
                <span className="block truncate">
                  {statuses[selectedStatus as StatusOptions]}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDownIcon
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
    </div>
  );
};
