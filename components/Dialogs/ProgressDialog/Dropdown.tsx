/* eslint-disable @next/next/no-img-element */

import { CheckIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "cmdk";
import pluralize from "pluralize";
import { type FC, useEffect, useState } from "react";
import { ChevronDown } from "@/components/Icons/ChevronDown";
import { cn } from "@/utilities/tailwind";

interface DropdownItem {
  value: string;
  id: string;
  timestamp?: string;
}
interface DropdownProps {
  onSelectFunction: (value: string) => void;
  selected: string | undefined;
  list: DropdownItem[];
  type: string;
  prefixUnselected?: string;
  buttonClassname?: string;
  shouldSort?: boolean;
  canSearch?: boolean;
}
export const Dropdown: FC<DropdownProps> = ({
  onSelectFunction,
  selected,
  list,
  type,
  prefixUnselected = "Select a",
  buttonClassname,
  shouldSort = true,
  canSearch = true,
}) => {
  const [open, setOpen] = useState(false);

  const [orderedList, setOrderedList] = useState<DropdownItem[]>([]);

  useEffect(() => {
    const sortedList = shouldSort
      ? list.sort((a, b) => {
          const aTimestamp = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTimestamp = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          if (aTimestamp > bTimestamp) {
            return -1;
          }
          if (aTimestamp < bTimestamp) {
            return 1;
          }
          return 0;
        })
      : list;
    setOrderedList(sortedList);
  }, [list, shouldSort]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "min-w-40 w-full max-w-max max-md:max-w-full justify-between flex flex-row cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6",
          buttonClassname
        )}
      >
        <div className="flex flex-row gap-4 w-full justify-between">
          <p className="block w-max">
            {selected
              ? list.find((item) => item.id === selected)?.value
              : `${prefixUnselected} ${pluralize(type, 1)}`}
          </p>
          <span>
            <ChevronDown className="h-5 w-5 text-black dark:text-white" />
          </span>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="mt-4 w-max max-w-[320px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2"
        >
          <Command>
            {canSearch ? (
              <div className="w-full px-2">
                <CommandInput
                  className="rounded-md px-2 w-full dark:text-white dark:bg-zinc-800"
                  placeholder={`Search ${type}...`}
                />
              </div>
            ) : null}
            <CommandEmpty className="px-4 py-2">No {type} found.</CommandEmpty>

            <CommandGroup className="divide-y divide-y-zinc-500">
              {orderedList.map((item) => (
                <CommandItem key={item.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectFunction(item.id);
                      setOpen(false);
                    }}
                    className="w-full my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900 bg-transparent border-none text-left"
                  >
                    <div className="flex flex-row gap-2 items-center justify-start w-full">
                      <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                        <p className="line-clamp-2 text-sm max-w-full break-normal">{item.value}</p>
                      </div>
                    </div>
                    <CheckIcon
                      className={cn("mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white")}
                      style={{
                        display: selected === item.id ? "block" : "none",
                      }}
                    />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
