"use client";
import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";
import { MaturityStageOptions } from "@/types";

const maturityStages: Record<MaturityStageOptions, string> = {
  all: "All Stages",
  "0": "Stage 0",
  "1": "Stage 1",
  "2": "Stage 2",
  "3": "Stage 3",
  "4": "Stage 4",
};

interface MaturityStageFilterProps {
  selectedMaturityStage: MaturityStageOptions;
  onChange: (stage: MaturityStageOptions) => void;
}

export function MaturityStageFilter({
  selectedMaturityStage,
  onChange,
}: MaturityStageFilterProps) {
  return (
    <Listbox value={selectedMaturityStage} onChange={onChange}>
      {({ open }) => (
        <div className="flex items-center gap-x-2 max-sm:w-full max-sm:justify-between">
          <div className="relative flex-1 w-max">
            <Listbox.Button
              id="maturity-stage-button"
              className="cursor-pointer items-center relative w-full rounded-md pr-8 text-left sm:text-sm sm:leading-6 text-black dark:text-white text-base font-normal"
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
              <Listbox.Options className="absolute z-10 dark:bg-zinc-800 dark:text-zinc-200 mt-1 max-h-60 w-max overflow-auto rounded-md bg-white py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {Object.keys(maturityStages).map((stageOption) => (
                  <Listbox.Option
                    key={stageOption}
                    className={({ active }) =>
                      cn(
                        active
                          ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                          : "text-gray-900 dark:text-gray-200",
                        "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                      )
                    }
                    value={stageOption}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={cn(
                            selected ? "font-semibold" : "font-normal",
                            "block truncate"
                          )}
                        >
                          {maturityStages[stageOption as MaturityStageOptions]}
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