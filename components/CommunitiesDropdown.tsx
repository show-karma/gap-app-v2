"use client";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { urlRegex } from "@/utilities/regexs/urlRegex";
/* eslint-disable @next/next/no-img-element */
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
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
import { FC, useState } from "react";

interface CommunitiesDropdownProps {
  onSelectFunction: (value: string, networkId: number) => void;
  previousValue?: string;
  communities: ICommunityResponse[];
}
export const CommunitiesDropdown: FC<CommunitiesDropdownProps> = ({
  onSelectFunction,
  previousValue,
  communities,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(previousValue || "");

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
      <Popover.Trigger className="min-w-40 w-full max-w-max max-md:max-w-full justify-between flex flex-row cursor-default items-center rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 px-4 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
        {value ? (
          <div className="flex flex-row gap-2 items-center">
            <Image
              src={
                communitiesArray.find((community) => community.value === value)
                  ?.logo || ""
              }
              alt={
                communitiesArray.find((community) => community.value === value)
                  ?.value || ""
              }
              width={20}
              height={20}
              className="rounded-full"
            />
            <div className="flex flex-row gap-1  items-center justify-start  flex-1">
              <p>
                {
                  communitiesArray.find(
                    (community) => community.value === value
                  )?.label
                }{" "}
              </p>
              <div className="flex flex-row gap-1 items-center">
                <p className="w-max text-[7px]">on</p>
                <Image
                  src={chainImgDictionary(
                    communitiesArray.find(
                      (community) => community.value === value
                    )?.networkId as number
                  )}
                  alt={chainNameDictionary(
                    communitiesArray.find(
                      (community) => community.value === value
                    )?.networkId as number
                  )}
                  className="rounded-full"
                  width={10}
                  height={10}
                />
                <p className="w-max text-[7px]">Network</p>
              </div>
            </div>
          </div>
        ) : (
          "Select community"
        )}
        <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Popover.Trigger>
      <Popover.Content className="mt-4 w-[360px] z-10 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800  max-h-60 overflow-y-auto overflow-x-hidden py-2">
        <Command>
          <CommandInput
            className="rounded-md ml-2 mr-4 w-[320px] dark:text-white dark:bg-zinc-800"
            placeholder="Search community..."
          />
          <CommandEmpty className="px-4 py-2">No community found.</CommandEmpty>
          <CommandGroup>
            {sortedCommunities.map((community) => {
              const isUrl = urlRegex.test(community.logo || "");
              return (
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
                    {isUrl && (
                      <Image
                        src={community.logo || ""}
                        alt={community.logo || ""}
                        className="m-0 rounded-full"
                        width={20}
                        height={20}
                      />
                    )}

                    <div className="flex flex-row gap-1  items-center justify-start  flex-1">
                      <p className="line-clamp-2 text-sm max-w-full break-normal">
                        {community.label}
                      </p>
                      <div className="flex flex-row gap-1 items-center">
                        <p className="w-max text-[7px]">on</p>
                        <Image
                          src={chainImgDictionary(community.networkId)}
                          alt={chainNameDictionary(community.networkId)}
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
