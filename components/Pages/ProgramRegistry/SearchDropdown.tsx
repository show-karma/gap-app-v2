/* eslint-disable @next/next/no-img-element */
import { FC, useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "cmdk";
import { CheckIcon } from "@heroicons/react/24/solid";
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
  cleanFunction?: () => void;
  prefixUnselected?: string;
  buttonClassname?: string;
  listClassname?: string;
  canAdd?: boolean;
  shouldSort?: boolean;
  canSearch?: boolean;
  id?: string;
  leftIcon?: React.ReactNode;
  paragraphClassname?: string;
  rightIcon?: React.ReactNode;
}
export const SearchDropdown: FC<SearchDropdownProps> = ({
  onSelectFunction,
  selected,
  list,
  imageDictionary,
  type,
  cleanFunction,
  prefixUnselected = "Any",
  buttonClassname,
  listClassname,
  canAdd = false,
  shouldSort = true,
  canSearch = true,
  id,
  leftIcon,
  paragraphClassname,
  rightIcon = <ChevronDown className="h-5 w-5 text-black dark:text-white" />,
}) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");

  const [orderedList, setOrderedList] = useState<
    {
      value: string;
      image:
        | {
            light: string;
            dark: string;
          }
        | undefined;
    }[]
  >([]);

  useEffect(() => {
    const parsedArray = list.map((item) => ({
      value: item,
      image: imageDictionary?.[item.toLowerCase()],
    }));

    const sortedList = shouldSort
      ? parsedArray.sort((a, b) => {
          if (a.value < b.value) {
            return -1;
          }
          if (a.value > b.value) {
            return 1;
          }
          return 0;
        })
      : parsedArray;
    console.log(list, parsedArray, sortedList);
    setOrderedList(sortedList);
  }, [list]);

  const addCustomNetwork = (customNetwork: string) => {
    setAdding(false);
    if (!customNetwork) {
      return;
    }
    const lowercasedList = list.map((item) => item.toLowerCase());
    if (!lowercasedList.includes(customNetwork.toLowerCase())) {
      onSelectFunction(customNetwork);
      list.push(customNetwork);
      orderedList.push({
        value: customNetwork,
        image: imageDictionary?.[customNetwork.toLowerCase()],
      });
      if (search.length) {
        new Promise<void>((resolve) => {
          setSearch("");
          resolve();
        }).then(() => {
          setSearch(customNetwork);
        });
      }

      setTitle("");
    } else {
      if (!selected.includes(customNetwork)) {
        onSelectFunction(customNetwork);
      }
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "min-w-40 w-full max-w-max max-md:max-w-full justify-between flex flex-row cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6",
          buttonClassname
        )}
        id={id}
      >
        <div className="flex flex-row gap-4 w-full justify-between">
          <div className="flex flex-row gap-4 items-center justify-start w-full">
            {leftIcon ? leftIcon : null}
            <p className={cn("block w-max", paragraphClassname)}>
              {selected.length
                ? `${selected.length} ${pluralize(
                    type,
                    selected.length
                  ).toLowerCase()} selected`
                : `${prefixUnselected} ${type}`}
            </p>
          </div>
          <span>{rightIcon ? rightIcon : null}</span>
        </div>
      </Popover.Trigger>
      <Popover.Content
        align="start"
        className={cn(
          "mt-4 w-[var(--radix-popover-trigger-width)] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800 max-h-60 overflow-y-auto overflow-x-hidden py-2",
          listClassname
        )}
      >
        <Command className={cn(listClassname)}>
          {canSearch ? (
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
          ) : null}
          <CommandEmpty className="px-4 py-2">No {type} found.</CommandEmpty>

          <CommandGroup className={cn(listClassname)}>
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
                        Any
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
              <CommandItem key={item.value}>
                <div
                  id={`${item.value}-item`}
                  onClick={() => {
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
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          {canAdd ? (
            adding ? (
              <div className="my-2 px-2">
                <input
                  className="rounded-md py-1 px-2 w-full dark:text-white dark:bg-zinc-800 border-zinc-200"
                  placeholder={`${pluralize(type, 1)} name...`}
                  // on enter key press, add the network
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter") {
                      addCustomNetwork(e.target?.value);
                    }
                  }}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                  }}
                />
              </div>
            ) : (
              <div className="my-2 px-2">
                <button
                  className="px-3 py-2 text-sm rounded-md bg-zinc-600 dark:bg-zinc-900 text-white dark:text-white w-full"
                  onClick={(e) => {
                    e?.preventDefault?.();
                    if (search.length) {
                      addCustomNetwork(search);
                    } else {
                      setAdding(true);
                    }
                  }}
                >
                  {`Add ${pluralize(type, 1).toLowerCase()}`}
                </button>
              </div>
            )
          ) : null}
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
