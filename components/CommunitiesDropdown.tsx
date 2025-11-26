"use client";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "cmdk";
import Image from "next/image";
import { createElement, type ElementType, type FC, useEffect, useRef, useState } from "react";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";

interface CommunitiesDropdownProps {
  onSelectFunction: (value: string, networkId: number) => void;
  previousValue?: string;
  communities: ICommunityResponse[];
  triggerClassName?: string;
  RightIcon?: ElementType;
  rightIconClassName?: string;
  LeftIcon?: ElementType;
  leftIconClassName?: string;
}
export const CommunitiesDropdown: FC<CommunitiesDropdownProps> = ({
  onSelectFunction,
  previousValue,
  communities,
  triggerClassName,
  RightIcon = ChevronUpDownIcon,
  LeftIcon,
  rightIconClassName,
  leftIconClassName,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(previousValue || "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null);

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, []);

  const communitiesArray = communities
    .filter((community) => community.details?.data?.name) // Filter out communities without a name
    .map((community) => ({
      value: community.uid,
      label: community.details?.data?.name || shortAddress(community.uid),
      networkId: community.chainID,
      logo: community.details?.data?.imageURL,
    }));

  // sort communities by name alphabetically
  const sortedCommunities = communitiesArray.sort((a, b) => {
    if (a.label < b.label) {
      return -1;
    }
    if (a.label > b.label) {
      return 1;
    }
    return 0;
  });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        ref={triggerRef}
        className={cn(
          "min-w-40 w-full max-w-max max-md:max-w-full justify-between flex flex-row items-center cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6",
          triggerClassName
        )}
      >
        {LeftIcon
          ? createElement(LeftIcon, {
              className: cn("mr-2 h-4 w-4 shrink-0 opacity-50", leftIconClassName),
            })
          : null}
        {value ? (
          <div className="flex flex-row gap-2 items-center">
            <Image
              src={
                communitiesArray.find((community) => community.value === value)?.logo ||
                "/placeholder.png"
              }
              alt={
                communitiesArray.find((community) => community.value === value)?.label ||
                "Community"
              }
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <div className="flex flex-row gap-1  items-center justify-start  flex-1">
              <p>{communitiesArray.find((community) => community.value === value)?.label} </p>
              <div className="flex flex-row gap-1 items-center">
                <p className="w-max text-[7px]">on</p>
                <Image
                  src={chainImgDictionary(
                    communitiesArray.find((community) => community.value === value)
                      ?.networkId as number
                  )}
                  alt={chainNameDictionary(
                    communitiesArray.find((community) => community.value === value)
                      ?.networkId as number
                  )}
                  width={10}
                  height={10}
                  className="min-w-2.5 min-h-2.5 w-2.5 h-2.5 m-0 rounded-full"
                />
                <p className="w-max text-[7px]">Network</p>
              </div>
            </div>
          </div>
        ) : (
          "Select community"
        )}
        {createElement(RightIcon, {
          className: cn("ml-2 h-4 w-4 shrink-0 opacity-50", rightIconClassName),
        })}
      </Popover.Trigger>
      <Popover.Content
        className="mt-4 z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800 max-h-60 overflow-y-auto overflow-x-hidden py-2"
        style={{ width: triggerWidth ? `${triggerWidth}px` : "auto" }}
      >
        <Command>
          <CommandInput
            className="rounded-md ml-2 mr-4 w-full dark:text-white dark:bg-zinc-800"
            placeholder="Search community..."
          />
          <CommandEmpty className="px-4 py-2">No community found.</CommandEmpty>
          <CommandGroup>
            {sortedCommunities.map((community) => (
              <CommandItem
                key={community.value}
                onSelect={() => {
                  setValue(community.value);
                  setOpen(false);
                  onSelectFunction(community.value, community.networkId);
                }}
                className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white",
                    value === community.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-row gap-2 items-center justify-start w-full">
                  <div className="min-w-5 min-h-5 w-5 h-5 m-0">
                    <Image
                      src={community.logo || "/placeholder.png"}
                      alt={community.label || "Community"}
                      width={20}
                      height={20}
                      className="min-w-5 min-h-5 w-5 h-5 m-0 rounded-full"
                    />
                  </div>
                  <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                    <p className="line-clamp-2 text-sm max-w-full break-normal">
                      {community.label}
                    </p>
                    <div className="flex flex-row gap-1 items-center">
                      <p className="w-max text-[7px]">on</p>
                      <Image
                        src={chainImgDictionary(community.networkId)}
                        alt={chainNameDictionary(community.networkId)}
                        width={10}
                        height={10}
                        className="min-w-2.5 min-h-2.5 w-2.5 h-2.5 m-0 rounded-full"
                      />
                      <p className="w-max text-[7px]">Network</p>
                    </div>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
