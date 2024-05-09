/* eslint-disable @next/next/no-img-element */
import { FC, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "cmdk";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/utilities/tailwind";
import { ChevronDown } from "@/components/Icons/ChevronDown";
import pluralize from "pluralize";
import Image from "next/image";

interface SearchDropdownProps {
  onSelectFunction: (value: string) => void;
  selected: string[];
  list: string[];
  imageDictionary?: Record<
    string,
    {
      light: string;
      dark: string;
    }
  >;
  type: string;
  cleanFunction: () => void;
  prefixUnselected?: string;
}
export const SearchDropdown: FC<SearchDropdownProps> = ({
  onSelectFunction,
  selected,
  list,
  imageDictionary,
  type,
  cleanFunction,
  prefixUnselected = "All",
}) => {
  const [open, setOpen] = useState(false);

  const parsedArray = list.map((item) => ({
    value: item,
    image: imageDictionary?.[item.toLowerCase()],
  }));

  const sortedList = parsedArray.sort((a, b) => {
    if (a.value < b.value) {
      return -1;
    }
    if (a.value > b.value) {
      return 1;
    }
    return 0;
  });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="min-w-40 w-full max-w-max max-md:max-w-full justify-between flex flex-row cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
        <div className="flex flex-row gap-4 w-full justify-between">
          <p className="block w-max">
            {selected.length
              ? `${selected.length} ${pluralize(
                  type,
                  selected.length
                ).toLowerCase()} selected`
              : `${prefixUnselected} ${type}`}
          </p>
          <span>
            <ChevronDown className="h-5 w-5 text-black dark:text-white" />
          </span>
        </div>
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-max max-w-[320px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <div className="w-full px-2">
            <CommandInput
              className="rounded-md px-2 w-full dark:text-white dark:bg-zinc-800"
              placeholder={`Search ${type}...`}
            />
          </div>
          <CommandEmpty className="px-4 py-2">No {type} found.</CommandEmpty>
          <CommandGroup>
            {cleanFunction ? (
              <CommandItem
                onSelect={() => {
                  cleanFunction();
                }}
                className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
              >
                <div className="flex flex-row gap-2 items-center justify-start w-full">
                  <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                    <p className="line-clamp-2 font-semibold text-sm max-w-full break-normal">
                      All
                    </p>
                  </div>
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white"
                    )}
                    style={{
                      display: selected.length ? "none" : "block",
                    }}
                  />
                </div>
              </CommandItem>
            ) : null}
            {sortedList.map((item) => (
              <CommandItem
                key={item.value}
                onSelect={() => {
                  //   setOpen(false);
                  onSelectFunction(item.value);
                }}
                className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
              >
                <div className="flex flex-row gap-2 items-center justify-start w-full">
                  {item.image ? (
                    <div className="min-w-5 min-h-5 w-5 h-5 m-0">
                      <Image
                        width={20}
                        height={20}
                        src={item.image.light}
                        alt={""}
                        className="min-w-5 min-h-5 w-5 h-5 m-0 rounded-full block dark:hidden"
                      />
                      <Image
                        width={20}
                        height={20}
                        src={item.image.dark}
                        alt={""}
                        className="min-w-5 min-h-5 w-5 h-5 m-0 rounded-full hidden dark:block"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                    <p className="line-clamp-2 text-sm max-w-full break-normal">
                      {item.value}
                    </p>
                  </div>
                </div>
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white"
                  )}
                  style={{
                    display: selected.includes(item.value) ? "block" : "none",
                  }}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
