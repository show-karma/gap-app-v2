/* eslint-disable @next/next/no-img-element */
import { cn } from "@/utilities/tailwind";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "cmdk";
import { FC, useEffect, useState } from "react";

interface Item {
  value: string;
  title: string;
}

interface SearchWithValueDropdownProps {
  onSelectFunction: (value: string) => void;
  selected: string[];
  list: Item[];
  type: string;
  cleanFunction?: () => void;
  prefixUnselected?: string;
  buttonClassname?: string;
  shouldSort?: boolean;
  id?: string;
  isMultiple?: boolean;
  customAddButton?: React.ReactNode;
  disabled?: boolean;
}

export const SearchWithValueDropdown: FC<SearchWithValueDropdownProps> = ({
  onSelectFunction,
  selected,
  list,
  type,
  cleanFunction,
  prefixUnselected = "Any",
  buttonClassname,
  shouldSort = true,
  id,
  isMultiple = true,
  customAddButton,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [orderedList, setOrderedList] = useState<Item[]>([]);

  useEffect(() => {
    const sortedList = shouldSort
      ? list.sort((a, b) => {
          if (a.title < b.title) {
            return -1;
          }
          if (a.title > b.title) {
            return 1;
          }
          return 0;
        })
      : list;
    setOrderedList(sortedList);
  }, [list, shouldSort]);

  const renderSelected = () => {
    if (selected.length) {
      if (isMultiple) {
        return selected
          .map(
            (item) =>
              orderedList.find((orderedItem) => orderedItem.value === item)
                ?.title
          )
          .sort()
          .join(", ");
      }
      return selected;
    }
    return `${prefixUnselected} ${type}`;
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "min-w-40 w-full max-w-[320px] max-md:max-w-full justify-between flex flex-row cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6",
          disabled && "opacity-50 cursor-not-allowed",
          buttonClassname
        )}
        id={id}
        disabled={disabled}
      >
        <div className="flex flex-row gap-4 w-full items-center justify-between">
          <p className="block w-max truncate">{renderSelected()}</p>
          <span>
            <ChevronDownIcon className="h-4 w-5 text-[#98A2B3] dark:text-white" />
          </span>
        </div>
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-max max-w-[320px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800 max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <div className="w-full px-2">
            <CommandInput
              id={`${id}-search`}
              name={`${id}-search`}
              className="rounded-md px-2 w-full dark:text-white dark:bg-zinc-800"
              placeholder={`Search ${type}...`}
              value={search}
              onValueChange={(value) => {
                setSearch(value);
              }}
            />
          </div>
          <CommandEmpty className="px-4 py-2">
            <p>No {type} found.</p>
          </CommandEmpty>

          <CommandGroup>
            {cleanFunction ? (
              <CommandItem>
                <div
                  onClick={() => {
                    cleanFunction();
                  }}
                  className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-row gap-2 items-center justify-start w-full">
                    <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                      <p className="line-clamp-2 font-semibold text-sm max-w-full break-normal">
                        {prefixUnselected} {type}
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
                </div>
              </CommandItem>
            ) : null}
            {orderedList.map((item) => (
              <CommandItem key={item.title + item.value}>
                <div
                  id={`${item.value}-item`}
                  onClick={() => {
                    onSelectFunction(item.value);
                  }}
                  className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-row gap-2 items-center justify-start w-full">
                    <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                      <p className="line-clamp-2 text-sm max-w-full break-normal">
                        {item.title}
                      </p>
                    </div>
                  </div>
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white"
                    )}
                    style={{
                      display:
                        selected.includes(item.value) ||
                        selected.includes(item.title)
                          ? "block"
                          : "none",
                    }}
                  />
                </div>
              </CommandItem>
            ))}
            {customAddButton && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-zinc-700">
                {customAddButton}
              </div>
            )}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
