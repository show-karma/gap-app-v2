"use client";

import { Listbox } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";

interface FilterSelectProps<T> {
  id: string;
  label: string;
  items: T[];
  value: T | null;
  onChange: (value: T) => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  placeholder: string;
  isEmpty: boolean;
  emptyButtonLabel: string;
  emptyHelp: React.ReactNode;
}

export const FilterSelect = <T,>({
  id,
  label,
  items,
  value,
  onChange,
  getKey,
  getLabel,
  placeholder,
  isEmpty,
  emptyButtonLabel,
  emptyHelp,
}: FilterSelectProps<T>) => {
  const helpId = `${id}-empty-help`;

  // When there is nothing to choose we render a plain, non-interactive button
  // instead of a HeadlessUI Listbox: HeadlessUI v2 manages its own aria
  // attributes and does not forward aria-describedby, so a native button is
  // the reliable way to associate the explanatory help text (WCAG 2.2 AA).
  if (isEmpty) {
    return (
      <>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
          {label}
        </label>
        <div className="relative mt-1">
          <button
            type="button"
            id={id}
            disabled
            aria-describedby={helpId}
            className="relative w-full cursor-not-allowed opacity-60 rounded-lg bg-white dark:bg-zinc-800 py-3 pl-4 pr-10 text-left border border-gray-200 dark:border-zinc-700 shadow-sm"
          >
            <span className="block truncate text-gray-900 dark:text-zinc-100">
              {emptyButtonLabel}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </button>
        </div>
        <div id={helpId} className="mt-2 space-y-1">
          {emptyHelp}
        </div>
      </>
    );
  }

  return (
    <>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
        {label}
      </label>
      <Listbox value={value} onChange={onChange}>
        <div className="relative mt-1">
          <Listbox.Button
            id={id}
            className="relative w-full cursor-default rounded-lg bg-white dark:bg-zinc-800 py-3 pl-4 pr-10 text-left border border-gray-200 dark:border-zinc-700 shadow-sm hover:border-primary/50 transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <span className="block truncate text-gray-900 dark:text-zinc-100">
              {value ? getLabel(value) : placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none">
            {items.map((item) => (
              <Listbox.Option
                key={getKey(item)}
                value={item}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-3 pl-4 pr-9 ${
                    active ? "bg-primary/5 text-primary" : "text-gray-900 dark:text-zinc-100"
                  }`
                }
              >
                {getLabel(item)}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </>
  );
};
