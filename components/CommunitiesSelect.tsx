"use client";
/* eslint-disable @next/next/no-img-element */
import { ChevronDown } from "@/components/Icons/ChevronDown";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";
import { CheckIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "cmdk";
import Image from "next/image";
import pluralize from "pluralize";
import { FC, useState } from "react";

interface CommunitiesSelectProps {
  onSelectFunction: (value: ICommunityResponse) => void;
  selected: string[];
  list: ICommunityResponse[];
  type: string;
  buttonClassname?: string;
  shouldSort?: boolean;
  canSearch?: boolean;
}
export const CommunitiesSelect: FC<CommunitiesSelectProps> = ({
  onSelectFunction,
  selected,
  list,
  type = "community",
  buttonClassname,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          `min-w-40 w-full max-w-max max-md:max-w-full justify-between flex flex-row cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6`,
          buttonClassname
        )}
      >
        <div className="flex flex-row gap-4 w-full justify-between">
          <p className="block w-max">
            {selected.length
              ? `${selected.length} ${pluralize(
                  type,
                  selected.length
                ).toLowerCase()}`
              : `Select ${pluralize(type, 1).toLowerCase()}`}
          </p>
          <span>
            <ChevronDown className="h-5 w-5 text-black dark:text-white" />
          </span>
        </div>
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-[360px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <CommandInput
            className="rounded-md ml-2 mr-4 w-[320px] dark:text-white dark:bg-zinc-800"
            placeholder="Search community..."
          />
          <CommandEmpty className="px-4 py-2">No community found.</CommandEmpty>

          <CommandGroup>
            {list.map((community) => {
              const isUrl = urlRegex.test(
                community.details?.data?.imageURL || ""
              );
              return (
                <CommandItem
                  key={community.uid}
                  onSelect={() => {
                    onSelectFunction(community);
                  }}
                  className="my-1 cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4 min-w-4 min-h-4 text-black dark:text-white",
                      selected.includes(community.uid)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-row gap-2 items-center justify-start w-full">
                    <div className="min-w-5 min-h-5 w-5 h-5 m-0">
                      {isUrl && (
                        <Image
                          src={community.details?.data?.imageURL || ""}
                          alt={community.details?.data.name || ""}
                          className="m-0 rounded-full"
                          width={20}
                          height={20}
                        />
                      )}
                    </div>
                    <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                      <p className="line-clamp-2 text-sm max-w-full break-normal">
                        {community.details?.data?.name ||
                          shortAddress(community.uid)}
                      </p>
                      <div className="flex flex-row gap-1 items-center">
                        <p className="w-max text-[7px]">on</p>
                        <Image
                          src={chainImgDictionary(community.chainID)}
                          alt={chainNameDictionary(community.chainID)}
                          className="m-0 rounded-full"
                          width={10}
                          height={10}
                        />
                        <p className="w-max text-[7px]">Network</p>
                      </div>
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};
