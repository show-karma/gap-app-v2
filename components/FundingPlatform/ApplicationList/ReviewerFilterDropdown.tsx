"use client";

import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronDownIcon, UsersIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, Fragment, memo, useMemo } from "react";
import type { ProgramReviewer } from "@/services/program-reviewers.service";
import { cn } from "@/utilities/tailwind";

interface IReviewerFilterDropdownProps {
  reviewers: ProgramReviewer[];
  selectedAddresses: string[];
  onChange: (addresses: string[]) => void;
  isLoading?: boolean;
  isError?: boolean;
}

const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

const reviewerLabel = (reviewer: ProgramReviewer) =>
  reviewer.name ||
  reviewer.email ||
  (reviewer.publicAddress ? shortenAddress(reviewer.publicAddress) : "Unknown reviewer");

const ReviewerFilterDropdown: FC<IReviewerFilterDropdownProps> = ({
  reviewers,
  selectedAddresses,
  onChange,
  isLoading = false,
  isError = false,
}) => {
  // Only reviewers with a resolved wallet address can be filtered on (the
  // backend matches applications by reviewer address).
  const selectableReviewers = useMemo(
    () =>
      reviewers
        .filter((reviewer) => !!reviewer.publicAddress)
        .map((reviewer) => ({
          ...reviewer,
          address: reviewer.publicAddress!.toLowerCase(),
        })),
    [reviewers]
  );

  const buttonLabel = useMemo(() => {
    if (selectedAddresses.length === 0) return "All reviewers";
    if (selectedAddresses.length === 1) {
      const match = selectableReviewers.find((r) => r.address === selectedAddresses[0]);
      return match ? reviewerLabel(match) : shortenAddress(selectedAddresses[0]);
    }
    return `${selectedAddresses.length} ${pluralize("reviewer", selectedAddresses.length)} selected`;
  }, [selectedAddresses, selectableReviewers]);

  if (isLoading) {
    return (
      <div className="h-[42px] w-full animate-pulse rounded-lg bg-gray-200 dark:bg-zinc-700" />
    );
  }

  if (isError) {
    return (
      <div className="flex h-[42px] items-center rounded-lg border border-gray-200 px-3 text-sm text-red-600 dark:border-zinc-700 dark:text-red-400">
        Failed to load reviewers
      </div>
    );
  }

  if (selectableReviewers.length === 0) {
    return (
      <div className="flex h-[42px] items-center rounded-lg border border-gray-200 px-3 text-sm text-gray-500 dark:border-zinc-700 dark:text-gray-400">
        No reviewers to filter
      </div>
    );
  }

  return (
    <Listbox value={selectedAddresses} onChange={onChange} multiple>
      <div className="relative">
        <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-10 text-left text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
          <span className="flex items-center">
            <UsersIcon className="mr-2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="block truncate">{buttonLabel}</span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 sm:text-sm">
            {selectableReviewers.map((reviewer) => (
              <Listbox.Option
                key={reviewer.address}
                value={reviewer.address}
                className={({ active }) =>
                  cn(
                    "relative cursor-pointer select-none py-2 pl-3 pr-9",
                    active
                      ? "bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
                      : "text-gray-900 dark:text-gray-100"
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <div className="flex flex-col">
                      <span className={cn("block truncate", selected && "font-semibold")}>
                        {reviewerLabel(reviewer)}
                      </span>
                      {reviewer.name && reviewer.email && (
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                          {reviewer.email}
                        </span>
                      )}
                    </div>
                    {selected && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

export default memo(ReviewerFilterDropdown);
