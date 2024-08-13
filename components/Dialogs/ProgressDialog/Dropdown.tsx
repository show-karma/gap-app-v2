"use client";
/* eslint-disable @next/next/no-img-element */
import { FC, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "cmdk";
import * as Popover from "@radix-ui/react-popover";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";
import pluralize from "pluralize";

interface DropdownProps {
  onSelectFunction: (value: string) => void;
  previousValue?: string;
  list: any[];
  listType: string;
}
export const Dropdown: FC<DropdownProps> = ({
  onSelectFunction,
  previousValue,
  list,
  listType,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(previousValue || "");

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="min-w-[240px] max-w-full w-max  justify-between text-black dark:text-white dark:bg-zinc-800 flex flex-row gap-2 px-4 py-2 items-center bg-gray-100 rounded-md">
        {value ? (
          <div className="flex flex-row gap-2 items-center">
            <p>{value}</p>
          </div>
        ) : (
          `Select ${listType}`
        )}
        <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-[360px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <CommandInput
            className="rounded-md ml-2 mr-4 w-[320px] dark:text-white dark:bg-zinc-800"
            placeholder={`Search ${pluralize(listType, list.length)}...`}
          />
          <CommandEmpty className="px-4 py-2">
            No {listType} found.
          </CommandEmpty>
          <CommandGroup>
            {list.map((item) => (
              <CommandItem
                key={item.value}
                onSelect={() => {
                  setValue(item.value);
                  setOpen(false);
                  onSelectFunction(item.value);
                }}
                className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white",
                    value === item.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-row gap-2 items-center justify-start w-full">
                  <p className="line-clamp-2 text-sm max-w-full break-normal">
                    {item.value}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
